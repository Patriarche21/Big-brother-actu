const axios = require("axios");

async function askDeepSeek(content) {
    const apiKey = process.env.DEEPSEEK_API_KEY;

    const prompt = `Tu es un rédacteur web professionnel...Et tu dois faire une résumé de l'article , le plus court possible Voici l'article original :${content}`;

    const payload = {
        model: "deepseek-chat",
        messages: [
            { role: "system", content: "Tu es un rédacteur expert." },
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

function extractDeepSeekResponse(rewritten, fallbackTitle = "Titre généré") {
    const match = rewritten.match(/TITRE:\s*(.+?)\n+CONTENU:\s*([\s\S]*)/i);
    const title = match ? match[1].trim() : fallbackTitle;
    const content = match ? match[2].trim() : rewritten;
    return { title, content };
}


// ✅ Fonction : Envoi Discord avec lien sur le titre
async function sendToDiscord(title, content, sourceUrl) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    await axios.post(webhookUrl, {
        embeds: [
            {
                title: title,
                url: sourceUrl, // Le titre devient un lien cliquable
                description: content,
                color: 0x3498db
            }
        ]
    });
}

module.exports = { askDeepSeek, extractDeepSeekResponse, sendToDiscord };

