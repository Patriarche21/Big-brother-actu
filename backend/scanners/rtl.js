const axios = require("axios");
const cheerio = require("cheerio");
const { askDeepSeek, extractDeepSeekResponse, sendToDiscord } = require("../utils/shared");

const BASE_URL = "https://www.rtl.be";
const START_PAGE = "https://www.rtl.be/actu/monde";

const published = new Set();

async function scanRTL(logArticle) {
    const html = await axios.get(START_PAGE);
    const $ = cheerio.load(html.data);

    const links = $("a[href*='/article/']")
        .map((i, el) => $(el).attr("href"))
        .get()
        .filter((href, i, arr) =>
            href && href.includes("/article/") && arr.indexOf(href) === i
        )
        .slice(0, 5)
        .map(href => (href.startsWith("http") ? href : BASE_URL + href));

    const results = [];

    for (const url of links) {
        if (published.has(url)) continue;

        try {
            const articleHtml = await axios.get(url);
            const $$ = cheerio.load(articleHtml.data);
            const paragraphs = $$("p").map((_, el) => $$(el).text()).get();
            const content = paragraphs.join("\n\n").slice(0, 5000);

            let imageUrl =
                $$("meta[property='og:image']").attr("content") ||
                $$("img").first().attr("data-src") ||
                $$("img").first().attr("src") ||
                null;

            if (imageUrl && imageUrl.startsWith("/")) {
                imageUrl = BASE_URL + imageUrl;
            }

            const rewritten = await askDeepSeek(content);
            const { title, content: rewrittenContent } = extractDeepSeekResponse(rewritten);

            await sendToDiscord(title, rewrittenContent, url, imageUrl, "RTL");
            published.add(url);
            results.push(url);
        } catch (err) {
            console.error("❌ RTL: Erreur avec", url, err.message);
        }
    }

    return results;
}

module.exports = { scanRTL, published };

