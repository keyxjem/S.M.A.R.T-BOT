require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder
} = require("discord.js");

const { GoogleSpreadsheet } = require("google-spreadsheet");

const COMMISSION_PAR_UNITE = 55;

/* ===============================
CLIENT DISCORD
================================ */

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

/* ===============================
READY
================================ */

client.once("ready", () => {
    console.log("✅ Bot prêt RP");
});

/* ===============================
UPDATE STOCK RESUME
================================ */

async function updateStockResume(guild) {

    const logChannel = guild.channels.cache.find(
        channel =>
            channel.name === "📦・stocks-logs" &&
            channel.parent &&
            channel.parent.name === "📁・LOGS"
    );

    if (!logChannel) return;

    const doc = new GoogleSpreadsheet(process.env.SHEET_ID);

    await doc.useServiceAccountAuth(
        JSON.parse(process.env.GOOGLE_CREDS)
    );

    await doc.loadInfo();

    const sheet = doc.sheetsByTitle["Stocks"];

    if (!sheet) return;

    const rows = await sheet.getRows();

    let totalStock = 0;
    let resumeText = "";

    rows.forEach(row => {

        const stock = Number(row.Stock || 0);

        totalStock += stock;

        resumeText += `👤 ${row.Joueur} → ${stock}\n`;
    });

    const embed = new EmbedBuilder()
        .setTitle("📦 Résumé Stocks Habitations")
        .setDescription(resumeText || "Aucune donnée")
        .addFields({
            name: "📊 Total stock pris",
            value: totalStock.toString()
        })
        .setColor(0x00ffcc);

    await logChannel.send({ embeds: [embed] });
}

/* ===============================
SETUP COMMAND
================================ */

client.on("messageCreate", async message => {

    if (message.author.bot) return;

    if (message.content === "!setup") {

        const button = new ButtonBuilder()
            .setCustomId("declare_vente")
            .setLabel("📦 Déclarer une vente")
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(button);

        const embed = new EmbedBuilder()
            .setTitle("💊 Déclaration des ventes")
            .setDescription("Clique pour déclarer une vente")
            .setImage("https://i.imgur.com/OYLdO9J.gif");

        await message.channel.send({
            embeds: [embed],
            components: [row]
        });
    }

    /* ===============================
    EYEGUARD WEBHOOK LISTENER
    ================================= */

    if (message.channel.name === "👁️・eyeguard" && message.webhookId) {

        try {

            const content = message.content;

            const lines = content.split("\n");

            let joueur = "";
            let objet = "";
            let quantite = 0;

            lines.forEach(line => {

                if (line.includes("Joueur")) {
                    joueur = line.split(":")[1].trim();
                }

                if (line.includes("Objet")) {
                    objet = line.split(":")[1].trim();
                }

                if (line.includes("Quantité")) {
                    quantite = Number(line.split(":")[1].trim());
                }

            });

            if (!joueur || !quantite) return;

            const doc = new GoogleSpreadsheet(process.env.SHEET_ID);

            await doc.useServiceAccountAuth(
                JSON.parse(process.env.GOOGLE_CREDS)
            );

            await doc.loadInfo();

            const sheet = doc.sheetsByTitle["Stocks"];

            if (!sheet) return;

            const rows = await sheet.getRows();

            let joueurRow = rows.find(row => row.Joueur === joueur);

            if (joueurRow) {

                joueurRow.Stock =
                    Number(joueurRow.Stock || 0) + quantite;

                await joueurRow.save();

            } else {

                await sheet.addRow({
                    Joueur: joueur,
                    Objet: objet,
                    Stock: quantite
                });
            }

            await updateStockResume(message.guild);

        } catch (err) {
            console.log("ERREUR EYEGUARD :", err);
        }
    }
});

/* ===============================
INTERACTIONS DECLARATION
================================ */

client.on("interactionCreate", async interaction => {

    if (interaction.isButton() && interaction.customId === "declare_vente") {

        const modal = new ModalBuilder()
            .setCustomId("vente_modal")
            .setTitle("Déclaration de Vente");

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("produit")
                    .setLabel("Produit (log uniquement)")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("quantite")
                    .setLabel("Quantité vendue")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("total")
                    .setLabel("Montant TOTAL encaissé ($)")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            )
        );

        await interaction.showModal(modal);
    }
});

/* ===============================
LOGIN
================================ */

client.login(process.env.BOT_TOKEN);