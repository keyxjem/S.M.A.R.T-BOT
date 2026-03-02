require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
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

client.once("ready", () => {
    console.log("Bot prêt 🔥");
});

/* ===============================
   COMMANDE SETUP
================================ */

client.on("messageCreate", async message => {

    if (message.author.bot) return;

    if (message.content === "!setup") {

        const button = new ButtonBuilder()
            .setCustomId("declare_vente")
            .setLabel("📦 Déclarer une vente")
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(button);

        await message.channel.send({
            content: "💊 **Déclaration officielle des ventes**",
            components: [row]
        });
    }
});

/* ===============================
   BOUTON CLIQUÉ
================================ */

client.on("interactionCreate", async interaction => {

    if (interaction.isButton()) {

        if (interaction.customId === "declare_vente") {

            const modal = new ModalBuilder()
                .setCustomId("vente_modal")
                .setTitle("Déclaration de Vente");

            const produit = new TextInputBuilder()
                .setCustomId("produit")
                .setLabel("Produit")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const quantite = new TextInputBuilder()
                .setCustomId("quantite")
                .setLabel("Quantité")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const prix = new TextInputBuilder()
                .setCustomId("prix")
                .setLabel("Prix")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(produit),
                new ActionRowBuilder().addComponents(quantite),
                new ActionRowBuilder().addComponents(prix)
            );

            await interaction.showModal(modal);
        }
    }

    /* ===============================
       MODAL SUBMIT
    ================================= */

    if (interaction.isModalSubmit()) {

        if (interaction.customId === "vente_modal") {

            try {

                const produit = interaction.fields.getTextInputValue("produit");
                const quantite = parseInt(interaction.fields.getTextInputValue("quantite"));
                const prix = parseFloat(interaction.fields.getTextInputValue("prix"));

                const doc = new GoogleSpreadsheet(process.env.SHEET_ID);

                await doc.useServiceAccountAuth(
                    JSON.parse(process.env.GOOGLE_CREDS)
                );

                await doc.loadInfo();

                const sheet = doc.sheetsByTitle["Ventes"];

                await sheet.addRow({
                    Date: new Date().toLocaleDateString(),
                    Vendeur: interaction.member.displayName,
                    Produit: produit,
                    Quantité: quantite,
                    "Prix Vente": prix,
                    "Total Vente": quantite * prix
                });

                await interaction.reply({
                    content: "✅ Vente envoyée au QG.",
                    ephemeral: true
                });

            } catch (err) {
                console.log(err);

                await interaction.reply({
                    content: "❌ Erreur lors de l'enregistrement.",
                    ephemeral: true
                });
            }
        }
    }
});

client.login(process.env.BOT_TOKEN);