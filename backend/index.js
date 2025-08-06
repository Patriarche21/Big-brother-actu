// ===== backend/index.js =====
const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

// Discord client
const client = require("./discordClient");
client.once("ready", () => console.log(`🤖 Discord client ready as ${client.user.tag}`));

const { scanRTBF, published: rtbfPublished } = require("./scanners/rtbf");
const { scanRTL, published: rtlPublished } = require("./scanners/rtl");
const { registerLogger } = require("./utils/shared");

const app = express();
app.use(cors());
app.use(express.json());

// Port configuration (default 3001)
const PORT = parseInt(process.env.PORT || "3001", 10);

// In-memory storage for frontend articles
const allArticles = [];

// Logger callback for scraped articles
function logArticle(title, content, url, image, source) {
  allArticles.push({ title, content, url, image, source });
}
registerLogger(logArticle);

// Serve static frontend build if present
const FRONTEND_DIST = path.resolve(__dirname, "../frontend/dist");
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
} else {
  console.warn("⚠️ Frontend dist not found at", FRONTEND_DIST);
}

// API endpoint: get all scraped/reworked articles
app.get("/all", (req, res) => {
  res.json(allArticles);
});

// API endpoint: get Discord messages
app.get("/discord", async (req, res) => {
  try {
    const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) {
      return res.status(404).json({ error: "Discord channel not found or not text-based" });
    }
    const fetched = await channel.messages.fetch({ limit: 20 });
    const payload = fetched.map(msg => ({
      content: msg.content,
      timestamp: msg.createdTimestamp,
      author: { username: msg.author.username },
      attachments: Array.from(msg.attachments.values()).map(a => ({ url: a.url })),
      url: msg.url
    }));
    res.json(payload);
  } catch (err) {
    console.error("❌ Error /discord:", err);
    res.status(500).json({ error: "Failed to fetch Discord messages" });
  }
});

// API endpoint: manual scan of RTBF and RTL
app.get("/scan", async (req, res) => {
  try {
    const rtbf = await scanRTBF(logArticle);
    const rtl = await scanRTL(logArticle);
    res.json({ rtbf, rtl });
  } catch (err) {
    console.error("❌ Global scan error:", err);
    res.status(500).json({ error: "Global scan failed" });
  }
});

// API endpoint: list of published URLs
app.get("/todos", (req, res) => {
  res.json({
    rtbf: Array.from(rtbfPublished),
    rtl: Array.from(rtlPublished)
  });
});

// Cron: hourly scans
cron.schedule("0 * * * *", async () => {
  console.log("🔁 [CRON] Scan RTBF");
  await scanRTBF(logArticle);
  console.log("🔁 [CRON] Scan RTL");
  await scanRTL(logArticle);
});

// SPA fallback: serve index.html for all other routes
app.get("*", (req, res) => {
  if (fs.existsSync(FRONTEND_DIST)) {
    res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  } else {
    res.status(404).send("Not Found");
  }
});

// Start server + initial scan with error handling
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  (async () => {
    console.log("⏳ Initial scan...");
    await scanRTBF(logArticle);
    await scanRTL(logArticle);
  })();
});

// Handle EADDRINUSE gracefully
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`⚠️ Port ${PORT} is already in use. Trying ${PORT + 1} instead...`);
    server.listen(PORT + 1, () => {
      console.log(`🚀 Server running on http://localhost:${PORT + 1}`);
    });
  } else {
    console.error('Server error:', err);
  }
});
