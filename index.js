require("dotenv").config();

const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

/* ===============================
MEMORY STOCK SYSTEM
================================ */

let stockMemory = {};

/* ===============================
UPDATE STOCK LOG MESSAGE
================================ */

async function updateStockLogs(guild) {

    try {

        const logChannel = guild.channels.cache.find(
            c => c.name.includes("stocks-logs")
        );

        if (!logChannel) return;

        let totalStockGlobal = 0;
        let resumeText = "";

        for (const joueur in stockMemory) {

            const stock = stockMemory[joueur];

            totalStockGlobal += stock;

            resumeText += `👤 ${joueur} → ${stock}\n`;
        }

        const embed = new EmbedBuilder()
            .setTitle("📦 Résumé Stocks Habitations")
            .setDescription(resumeText || "Aucune donnée")
            .addFields({
                name: "📊 Total stock pris",
                value: totalStockGlobal.toString()
            })
            .setColor(0x00ffcc);

        const messages = await logChannel.messages.fetch({ limit: 1 });

        if (messages.size > 0) {
            const msg = messages.first();
            await msg.edit({ embeds: [embed] });
        } else {
            await logChannel.send({ embeds: [embed] });
        }

        console.log("✅ Stocks logs mis à jour");

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

        console.log("✅ EyeGuard webhook reçu");

        const content = message.content;

        if (!content.includes("a retiré") && !content.includes("a déposé")) return;

        const regex = /^(.+?) (?:a retiré|a déposé) (\d+)x (.+)$/m;

        const match = content.split("\n")[1]?.match(regex);

        if (!match) return;

        const joueur = match[1].trim();
        const quantite = Number(match[2]);

        console.log("Parsed webhook :", joueur, quantite);

        if (!stockMemory[joueur]) stockMemory[joueur] = 0;

        stockMemory[joueur] += quantite;

        await updateStockLogs(message.guild);

    } catch (err) {
        console.log("EYEGUARD ERROR :", err);
    }

});

/* ===============================
BOT READY
================================ */

client.once("clientReady", () => {
    console.log("✅ Bot RP prêt");
});

/* ===============================
LOGIN
================================ */

client.login(process.env.BOT_TOKEN);