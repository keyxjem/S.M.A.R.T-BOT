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
   CONFIG
================================ */

const COMMISSION_PAR_UNITE = 55;

/* ===============================
   READY
================================ */

client.once("ready", () => {
    console.log("Bot prêt 🔥");
});

/* ===============================
   SETUP
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
                .setLabel("Produit vendu")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const quantite = new TextInputBuilder()
                .setCustomId("quantite")
                .setLabel("Quantité vendue")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const montantTotal = new TextInputBuilder()
                .setCustomId("total")
                .setLabel("Montant TOTAL encaissé ($)")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(produit),
                new ActionRowBuilder().addComponents(quantite),
                new ActionRowBuilder().addComponents(montantTotal)
            );

            await interaction.showModal(modal);
        }
    }

    if (interaction.isModalSubmit()) {

        if (interaction.customId === "vente_modal") {

            try {

                const vendeur = interaction.member.nickname || interaction.user.username;
                const produit = interaction.fields.getTextInputValue("produit");
                const quantite = parseInt(interaction.fields.getTextInputValue("quantite"));
                const totalVenteAjout = parseInt(interaction.fields.getTextInputValue("total"));

                if (isNaN(quantite) || quantite <= 0 || isNaN(totalVenteAjout) || totalVenteAjout <= 0) {
                    return interaction.reply({
                        content: "❌ Quantité ou montant invalide.",
                        ephemeral: true
                    });
                }

                const payeAjout = quantite * COMMISSION_PAR_UNITE;

                const doc = new GoogleSpreadsheet(process.env.SHEET_ID);

                await doc.useServiceAccountAuth(
                    JSON.parse(process.env.GOOGLE_CREDS)
                );

                await doc.loadInfo();

                const sheet = doc.sheetsByTitle["Ventes"];

                await sheet.loadHeaderRow();
                const rows = await sheet.getRows();

                const vendeurRow = rows.find(row => row.get("Vendeur") === vendeur);

                if (vendeurRow) {

                    const nouvelleQuantite = Number(vendeurRow.get("Quantité")) + quantite;
                    const nouveauTotal = Number(vendeurRow.get("Total Vente")) + totalVenteAjout;
                    const nouvellePaye = Number(vendeurRow.get("Paye")) + payeAjout;

                    vendeurRow.set("Quantité", nouvelleQuantite);
                    vendeurRow.set("Total Vente", nouveauTotal);
                    vendeurRow.set("Paye", nouvellePaye);

                    await vendeurRow.save();

                } else {

                    await sheet.addRow({
                        Vendeur: vendeur,
                        Quantité: quantite,
                        "Total Vente": totalVenteAjout,
                        Paye: payeAjout
                    });
                }

                await interaction.reply({
                    content:
                        `✅ Vente enregistrée.\n\n` +
                        `🧪 Produit : ${produit}\n` +
                        `📦 Quantité : ${quantite}\n` +
                        `💰 Total gang : ${totalVenteAjout}$\n` +
                        `💵 Commission ajoutée : ${payeAjout}$`,
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