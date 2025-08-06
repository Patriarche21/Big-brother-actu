const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

// Crée le client avec les intents nécessaires pour lire les messages
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Connexion avec le token du bot
client.login(process.env.DISCORD_BOT_TOKEN)
  .catch(err => console.error('❌ Discord login failed:', err));

module.exports = client;