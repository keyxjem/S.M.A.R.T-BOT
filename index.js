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
CLIENT
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
    console.log("✅ Bot prêt");
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

        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle("💊 Déclaration des ventes")
            .setDescription("Clique sur le bouton ci-dessous pour déclarer une vente.")
            .setImage("https://i.imgur.com/OYLdO9J.gif");

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

    /* ===============================
    MODAL SUBMIT
    ================================= */

    if (interaction.isModalSubmit() && interaction.customId === "vente_modal") {

        try {

            await interaction.deferReply({ ephemeral: true });

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
                return interaction.editReply({
                    content: "❌ Données invalides."
                });
            }

            const payeAjout = quantite * COMMISSION_PAR_UNITE;

            /* GOOGLE SHEETS */

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
                ? Number((vendeurRow["Total Vente"] || "0").replace(" $", ""))
                : 0;

            const ancienneQuantite = vendeurRow
                ? Number(vendeurRow["Quantité"] || 0)
                : 0;

            const anciennePaye = vendeurRow
                ? Number((vendeurRow["Paye"] || "0").replace(" $", ""))
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

            /* LOGS DISCORD */

            const logChannel = interaction.guild.channels.cache.find(
                channel =>
                    channel.name === "💊・déclaration-logs" &&
                    channel.parent &&
                    channel.parent.name === "📁・LOGS"
            );

            if (logChannel) {

                const logEmbed = new EmbedBuilder()
                    .setColor(0xff0000)
                    .setTitle("📊 Nouvelle déclaration")
                    .setDescription(
                        `👤 Vendeur : ${vendeur}\n` +
                        `🧪 Produit : ${produit}\n` +
                        `📦 Quantité : ${quantite}\n` +
                        `💰 Total gang : ${totalAjout} $\n` +
                        `💵 Commission : ${payeAjout} $`
                    )
                    .setFooter({
                        text: new Date().toLocaleString()
                    });

                await logChannel.send({ embeds: [logEmbed] });
            }

            await interaction.editReply({
                content: "✅ Vente enregistrée."
            });

        } catch (err) {

            console.log("ERREUR BOT :", err);

            try {
                await interaction.editReply({
                    content: "❌ Une erreur est survenue."
                });
            } catch {}
        }
    }
});

/* ===============================
LOGIN
================================ */

client.login(process.env.BOT_TOKEN);