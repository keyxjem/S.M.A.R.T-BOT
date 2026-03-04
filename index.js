require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const { GoogleSpreadsheet } = require("google-spreadsheet");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

/* ================= GOOGLE SHEETS ================= */

async function getSheet() {
    const doc = new GoogleSpreadsheet(process.env.SHEET_ID);
    await doc.useServiceAccountAuth(JSON.parse(process.env.GOOGLE_CREDS));
    await doc.loadInfo();
    return doc.sheetsByIndex[0];
}

/* ================= STOCK MEMORY ================= */

let stockMemory = {};

async function updateStockLogs(guild) {
    const channel = guild.channels.cache.find(
        c => c.name === "📦・stocks-logs" &&
            c.parent &&
            c.parent.name === "📁・LOGS"
    );

    if (!channel) return;

    let total = 0;
    let text = "";

    for (const user in stockMemory) {
        total += stockMemory[user];
        text += `👤 ${user} → ${stockMemory[user]}\n`;
    }

    const embed = new EmbedBuilder()
        .setTitle("📦 Résumé Stocks")
        .setDescription(text || "Aucune donnée")
        .addFields({ name: "📊 Total global", value: total.toString() })
        .setColor(0x00ffcc);

    const messages = await channel.messages.fetch({ limit: 1 });

    if (messages.size > 0) {
        await messages.first().edit({ embeds: [embed] });
    } else {
        await channel.send({ embeds: [embed] });
    }
}

/* ================= READY ================= */

client.once("clientReady", () => {
    console.log("✅ Bot RP prêt");
});

/* ================= SETUP BOUTON ================= */

client.on("messageCreate", async message => {

    if (message.content === "!setup") {

        const button = new ButtonBuilder()
            .setCustomId("declare_sale")
            .setLabel("💊 Déclarer une vente")
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        const embed = new EmbedBuilder()
            .setTitle("💊 Système de déclaration")
            .setDescription("Cliquez pour déclarer une vente.")
            .setImage("https://i.imgur.com/OYLdO9J.gif")
            .setColor(0x9900ff);

        await message.channel.send({
            embeds: [embed],
            components: [row]
        });
    }

    /* ===== EYEGUARD STOCK LISTENER ===== */

    if (message.webhookId &&
        message.channel.id === process.env.EYEGUARD_CHANNEL_ID) {

        const content = message.content;

        if (!content.includes("a retiré") &&
            !content.includes("a déposé")) return;

        const regex = /^(.+?) (?:a retiré|a déposé) (\d+)x (.+)$/m;
        const match = content.split("\n")[1]?.match(regex);

        if (!match) return;

        const joueur = match[1].trim();
        const quantite = Number(match[2]);

        if (!stockMemory[joueur]) stockMemory[joueur] = 0;
        stockMemory[joueur] += quantite;

        await updateStockLogs(message.guild);
    }
});

/* ================= INTERACTIONS ================= */

client.on("interactionCreate", async interaction => {

    try {

        /* ===== BOUTON ===== */

        if (interaction.isButton() &&
            interaction.customId === "declare_sale") {

            const modal = new ModalBuilder()
                .setCustomId("sale_modal")
                .setTitle("Déclaration de vente");

            const produit = new TextInputBuilder()
                .setCustomId("produit")
                .setLabel("Produit vendu (logs seulement)")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const quantite = new TextInputBuilder()
                .setCustomId("quantite")
                .setLabel("Quantité vendue")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const totalGang = new TextInputBuilder()
                .setCustomId("total")
                .setLabel("Total gagné pour le gang")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(produit),
                new ActionRowBuilder().addComponents(quantite),
                new ActionRowBuilder().addComponents(totalGang)
            );

            return interaction.showModal(modal);
        }

        /* ===== MODAL ===== */

        if (interaction.isModalSubmit() &&
            interaction.customId === "sale_modal") {

            await interaction.deferReply({ flags: 64 });

            const produit = interaction.fields.getTextInputValue("produit");
            const quantite = Number(interaction.fields.getTextInputValue("quantite"));
            const totalGang = interaction.fields.getTextInputValue("total");

            if (isNaN(quantite)) {
                return interaction.editReply("Quantité invalide.");
            }

            const vendeur = interaction.member.displayName;
            const commission = quantite * 55;

            const sheet = await getSheet();
            await sheet.loadHeaderRow();
            const rows = await sheet.getRows();

            let userRow = rows.find(r => r.get("Vendeur") === vendeur);

            if (!userRow) {
                await sheet.addRow({
                    Vendeur: vendeur,
                    "Total quantité": quantite,
                    "Commission totale": commission
                });
            } else {
                userRow.set("Total quantité",
                    Number(userRow.get("Total quantité")) + quantite);

                userRow.set("Commission totale",
                    Number(userRow.get("Commission totale")) + commission);

                await userRow.save();
            }

            const logChannel = interaction.guild.channels.cache.find(
                c => c.name === "💊・déclaration-logs"
            );

            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setTitle("💊 Nouvelle déclaration")
                    .addFields(
                        { name: "👤 Vendeur", value: vendeur },
                        { name: "📦 Produit", value: produit },
                        { name: "🔢 Quantité", value: quantite.toString() },
                        { name: "💰 Total Gang", value: totalGang + "$" },
                        { name: "💵 Commission", value: commission + "$" }
                    )
                    .setColor(0x00ff00);

                await logChannel.send({ embeds: [embed] });
            }

            await interaction.editReply("✅ Vente enregistrée avec succès.");
        }

    } catch (err) {
        console.log("INTERACTION ERROR :", err);

        if (interaction.deferred) {
            await interaction.editReply("Une erreur s'est produite.");
        }
    }
});

/* ================= LOGIN ================= */

client.login(process.env.BOT_TOKEN);