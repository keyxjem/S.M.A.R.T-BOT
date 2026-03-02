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
                .setLabel("Produit (log uniquement)")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

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
                new ActionRowBuilder().addComponents(produit),
                new ActionRowBuilder().addComponents(quantite),
                new ActionRowBuilder().addComponents(total)
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

                const vendeur =
                    interaction.member.nickname ||
                    interaction.user.username;

                const produit =
                    interaction.fields.getTextInputValue("produit");

                const quantite = parseInt(
                    interaction.fields.getTextInputValue("quantite")
                );

                const totalAjout = parseInt(
                    interaction.fields.getTextInputValue("total")
                );

                if (!quantite || !totalAjout) {
                    return interaction.reply({
                        content: "❌ Données invalides.",
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

                const vendeurRow = rows.find(
                    row => row.Vendeur === vendeur
                );

                const ancienTotal = vendeurRow
                    ? Number(
                        (vendeurRow["Total Vente"] || "0").replace(" $", "")
                    )
                    : 0;

                const ancienneQuantite = vendeurRow
                    ? Number(vendeurRow["Quantité"] || 0)
                    : 0;

                const anciennePaye = vendeurRow
                    ? Number(
                        (vendeurRow["Paye"] || "0").replace(" $", "")
                    )
                    : 0;

                const nouvelleQuantite = ancienneQuantite + quantite;
                const nouveauTotal = ancienTotal + totalAjout;
                const nouvellePaye = anciennePaye + payeAjout;

                if (vendeurRow) {

                    vendeurRow["Quantité"] = nouvelleQuantite;
                    vendeurRow["Total Vente"] = nouveauTotal + " $";
                    vendeurRow["Paye"] = nouvellePaye + " $";

                    await vendeurRow.save();

                } else {

                    await sheet.addRow({
                        Vendeur: vendeur,
                        Quantité: quantite,
                        "Total Vente": totalAjout + " $",
                        Paye: payeAjout + " $"
                    });
                }

                await interaction.reply({
                    content:
                        `✅ Vente enregistrée.\n\n` +
                        `🧪 Produit : ${produit}\n` +
                        `📦 Quantité : ${quantite}\n` +
                        `💰 Total gang : ${totalAjout} $\n` +
                        `💵 Commission ajoutée : ${payeAjout} $`,
                    ephemeral: true
                });

            } catch (err) {

                console.log("ERREUR BOT :", err);

                await interaction.reply({
                    content: "❌ Erreur lors de l'enregistrement.",
                    ephemeral: true
                });
            }
        }
    }
});

client.login(process.env.BOT_TOKEN);