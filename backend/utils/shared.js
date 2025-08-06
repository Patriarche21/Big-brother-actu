// ===== utils/shared.js =====
const axios = require("axios");

let logArticleCallback = null;
function registerLogger(fn) {
    logArticleCallback = fn;
}

async function askDeepSeek(content) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const prompt = `Tu es un journaliste professionnel.Ta mission : faire un résumé très court et engageant de l'article suivant.Instructions :
- Génére un TITRE percutant différent de l’original (ce sera le lien cliquable)
- Rédige un résumé clair (max 500 mots)
- Utilise une mise en forme fluide (puces, paragraphes)
- PAS de hashtags, PAS de **gras**

Formate ta réponse EXPLICITEMENT comme ceci :

TITRE: [Titre généré ici]
CONTENU: [Résumé ici]

Voici l’article à résumer :
${content}`.trim();

    const payload = {
        model: "deepseek-chat",
        messages: [
            { role: "system", content: "Tu es un rédacteur expert, spécialiste des résumés." },
            { role: "user", content: prompt }
        ],
        temperature: 0.7
    };

    const response = await axios.post("https://api.deepseek.com/v1/chat/completions", payload, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        }
    });

    return response.data.choices[0].message.content;
}

function extractDeepSeekResponse(rewritten, fallbackTitle = null) {
    const match = rewritten.match(/TITRE:\s*(.+?)\n+CONTENU:\s*([\s\S]*)/i);
    const title = match && match[1].trim().toLowerCase() !== "titre généré"
        ? match[1].trim()
        : fallbackTitle || "⚠️ Titre manquant";
    const content = match ? match[2].trim() : rewritten;
    return { title, content };
}

async function sendToDiscord(title, content, sourceUrl, imageUrl = null, sourceName = null) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    const embed = {
        title,
        url: sourceUrl,
        description: content,
        color: 0x3498db,
        footer: sourceName ? { text: `📰 Source: ${sourceName}` } : undefined,
    };

    if (imageUrl) {
        embed.thumbnail = { url: imageUrl }; // 📌 image juste sous le titre (Discord)
    }

    await axios.post(webhookUrl, { embeds: [embed] });

    if (logArticleCallback) {
        logArticleCallback(title, content, sourceUrl, imageUrl, sourceName);
    }
}

module.exports = {
    askDeepSeek,
    extractDeepSeekResponse,
    sendToDiscord,
    registerLogger,
};
