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
    StringSelectMenuBuilder
} = require("discord.js");

const { GoogleSpreadsheet } = require("google-spreadsheet");

/* ===============================
CONFIGURATION
================================ */

const COMMISSION_PAR_UNITE = 55;

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
    console.log("Bot prêt 🔥");
});

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

        const embed = {
            color: 0x0099ff,
            title: "💊 Déclaration des ventes",
            description: "Clique sur le bouton ci-dessous pour déclarer une vente 💼",
            image: {
                url: "https://i.imgur.com/OYLdO9J.gif"
            },
            footer: {
                text: "Système de déclaration automatique"
            }
        };

        await message.channel.send({
            embeds: [embed],
            components: [row]
        });
    }
});

/* ===============================
INTERACTIONS
================================ */

client.on("interactionCreate", async interaction => {

    /* ===== BOUTON ===== */

    if (interaction.isButton() && interaction.customId === "declare_vente") {

        const menu = new StringSelectMenuBuilder()
            .setCustomId("select_produit")
            .setPlaceholder("Choisis le produit vendu")
            .addOptions(
                { label: "🍄 Blacktriple", value: "Blacktriple" },
                { label: "❄️ Cocaïne", value: "Cocaïne" },
                { label: "💎 Crack", value: "Crack" },
                { label: "💊 Ecstasy", value: "Ecstasy" },
                { label: "💉 Héroïne", value: "Héroïne" },
                { label: "⚗️ Meth", value: "Meth" },
                { label: "🔵🧪 MethBleu", value: "MethBleu" },
                { label: "🟣 Purple", value: "Purple" },
                { label: "🌿 Salvia", value: "Salvia" },
                { label: "🖤 SporeX", value: "SporeX" },
                { label: "🍁 Weed", value: "Weed" }
            );

        const row = new ActionRowBuilder().addComponents(menu);

        return interaction.reply({
            content: "📦 Sélectionne le produit :",
            components: [row],
            flags: 64
        });
    }

    /* ===== MENU PRODUIT ===== */

    if (interaction.isStringSelectMenu() &&
        interaction.customId === "select_produit") {

        const produitChoisi = interaction.values[0];

        const modal = new ModalBuilder()
            .setCustomId("vente_modal_" + produitChoisi)
            .setTitle("Déclaration - " + produitChoisi);

        const quantite = new TextInputBuilder()
            .setCustomId("quantite")
            .setLabel("Quantité vendue")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const total = new TextInputBuilder()
            .setCustomId("total")
            .setLabel("Montant TOTAL encaissé ($)")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(quantite),
            new ActionRowBuilder().addComponents(total)
        );

        return interaction.showModal(modal);
    }

    /* ===== MODAL ===== */

    if (interaction.isModalSubmit() &&
        interaction.customId.startsWith("vente_modal_")) {

        try {

            await interaction.deferReply({ flags: 64 });

            const produit = interaction.customId.replace("vente_modal_", "");

            const vendeur =
                interaction.member.nickname ||
                interaction.user.username;

            const quantite = parseInt(
                interaction.fields.getTextInputValue("quantite")
            );

            const totalAjout = parseInt(
                interaction.fields.getTextInputValue("total")
            );

            if (isNaN(quantite) || isNaN(totalAjout)) {
                return interaction.editReply({
                    content: "❌ Données invalides."
                });
            }

            const payeAjout = quantite * COMMISSION_PAR_UNITE;

            const doc = new GoogleSpreadsheet(process.env.SHEET_ID);

            await doc.useServiceAccountAuth(
                JSON.parse(process.env.GOOGLE_CREDS)
            );

            await doc.loadInfo();

            const sheet = doc.sheetsByTitle["Ventes"];

            const rows = await sheet.getRows();

            const vendeurRow = rows.find(
                row => row.Vendeur === vendeur
            );

            if (vendeurRow) {

                vendeurRow["Quantité"] =
                    Number(vendeurRow["Quantité"] || 0) + quantite;

                vendeurRow["Total Vente"] =
                    Number((vendeurRow["Total Vente"] || "0").replace(" $", "")) + totalAjout + " $";

                vendeurRow["Paye"] =
                    Number((vendeurRow["Paye"] || "0").replace(" $", "")) + payeAjout + " $";

                await vendeurRow.save();

            } else {

                await sheet.addRow({
                    Vendeur: vendeur,
                    Quantité: quantite,
                    "Total Vente": totalAjout + " $",
                    Paye: payeAjout + " $"
                });
            }

            await interaction.editReply({
                content: "✅ Vente enregistrée avec succès."
            });

        } catch (err) {

            console.log("ERREUR BOT :", err);

            try {
                await interaction.editReply({
                    content: "❌ Une erreur s'est produite."
                });
            } catch {}
        }
    }
});

/* ===============================
LOGIN
================================ */

client.login(process.env.BOT_TOKEN);