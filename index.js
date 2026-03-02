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

/* ===============================
   CONFIGURATION
================================ */

const PRIX_GANG = 300;              // Argent généré pour le gang par unité
const COMMISSION_PAR_UNITE = 55;    // Commission vendeur par unité

/* ===============================
   BOT READY
================================ */

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
   INTERACTIONS
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

            modal.addComponents(
                new ActionRowBuilder().addComponents(produit),
                new ActionRowBuilder().addComponents(quantite)
            );

            await interaction.showModal(modal);
        }
    }

    if (interaction.isModalSubmit()) {

        if (interaction.customId === "vente_modal") {

            try {

                const produit = interaction.fields.getTextInputValue("produit");
                const quantite = parseInt(interaction.fields.getTextInputValue("quantite"));

                if (isNaN(quantite) || quantite <= 0) {
                    return interaction.reply({
                        content: "❌ Quantité invalide.",
                        ephemeral: true
                    });
                }

                const totalGang = quantite * PRIX_GANG;
                const payeVendeur = quantite * COMMISSION_PAR_UNITE;

                const doc = new GoogleSpreadsheet(process.env.SHEET_ID);

                await doc.useServiceAccountAuth(
                    JSON.parse(process.env.GOOGLE_CREDS)
                );

                await doc.loadInfo();

                const sheet = doc.sheetsByTitle["Ventes"];

                await sheet.addRow({
                    Date: new Date().toLocaleDateString(),
                    Vendeur: interaction.member.nickname || interaction.user.username,
                    Produit: produit,
                    Quantité: quantite,
                    "Prix Vente": PRIX_GANG,
                    "Total Vente": totalGang,
                    "Paye": payeVendeur
                });

                await interaction.reply({
                    content: `✅ Vente enregistrée.\n💰 Gang : ${totalGang}$\n💵 Ta commission : ${payeVendeur}$`,
                    ephemeral: true
                });

            } catch (err) {

                console.log("ERREUR SHEETS :", err);

                await interaction.reply({
                    content: "❌ Erreur lors de l'enregistrement.",
                    ephemeral: true
                });
            }
        }
    }
});

client.login(process.env.BOT_TOKEN);