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
READY EVENT
================================ */

client.once("clientReady", () => {
    console.log("✅ Bot RP prêt");
});

/* ===============================
GOOGLE DATABASE HELPERS
================================ */

async function updateStockDatabase(joueur, objet, quantite, guild) {

    try {

        const doc = new GoogleSpreadsheet(process.env.SHEET_ID);

        await doc.useServiceAccountAuth(
            JSON.parse(process.env.GOOGLE_CREDS)
        );

        await doc.loadInfo();

        const sheet = doc.sheetsByTitle["Stocks"];

        if (!sheet) return;

        const rows = await sheet.getRows();

        let row = rows.find(r => r.Joueur === joueur);

        if (row) {

            row.Stock = Number(row.Stock || 0) + quantite;
            await row.save();

        } else {

            await sheet.addRow({
                Joueur: joueur,
                Objet: objet,
                Stock: quantite
            });
        }

        await updateStockResume(guild);

    } catch (err) {
        console.log("DATABASE ERROR :", err);
    }
}

/* ===============================
STOCK RESUME LOG
================================ */

async function updateStockResume(guild) {

    try {

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

    } catch (err) {
        console.log("RESUME ERROR :", err);
    }
}

/* ===============================
EYEGUARD WEBHOOK LISTENER
================================ */

client.on("messageCreate", async message => {

    try {

        if (!message.webhookId) return;

        if (message.channel.id !== process.env.EYEGUARD_CHANNEL_ID) return;

        console.log("Webhook EyeGuard détecté");

        const lines = message.content.split("\n");

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

        await updateStockDatabase(
            joueur,
            objet,
            quantite,
            message.guild
        );

    } catch (err) {
        console.log("EYEGUARD ERROR :", err);
    }

});

/* ===============================
LOGIN BOT
================================ */

client.login(process.env.BOT_TOKEN);