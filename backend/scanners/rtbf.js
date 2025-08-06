const axios = require("axios");
const cheerio = require("cheerio");
const { askDeepSeek, extractDeepSeekResponse, sendToDiscord } = require("../utils/shared");

const published = new Set();

async function scanRTBF(logArticle) {
    const sourceUrl = "https://www.rtbf.be/dossier/monde";
    const siteBase = "https://www.rtbf.be";

    const html = await axios.get(sourceUrl);
    const $ = cheerio.load(html.data);

    const links = $("a[href*='/article']")
        .map((i, el) => $(el).attr("href"))
        .get()
        .filter((href, i, arr) =>
            href && /\/article\/.+-\d+$/.test(href) && arr.indexOf(href) === i
        )
        .slice(0, 5)
        .map(href => (href.startsWith("http") ? href : siteBase + href));

    const newArticles = [];

    for (const url of links) {
        if (published.has(url)) continue;

        try {
            const articleHTML = await axios.get(url);
            const $$ = cheerio.load(articleHTML.data);

            const paragraphs = $$("p").map((_, el) => $$(el).text()).get();
            const content = paragraphs.join("\n\n").slice(0, 5000);

            let imageUrl =
                $$("meta[property='og:image']").attr("content") ||
                $$("img").first().attr("data-src") ||
                $$("img").first().attr("src") ||
                null;

            if (imageUrl && imageUrl.startsWith("/")) {
                imageUrl = siteBase + imageUrl;
            }

            const rewritten = await askDeepSeek(content);
            const { title, content: rewrittenContent } = extractDeepSeekResponse(rewritten);

            await sendToDiscord(title, rewrittenContent, url, imageUrl, "RTBF");
            published.add(url);
            newArticles.push(url);
        } catch (err) {
            console.error(`❌ RTBF: Erreur avec ${url} :`, err.message);
        }
    }

    return { status: "ok", new: newArticles };
}

module.exports = { scanRTBF, published };
