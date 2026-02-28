import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import { startDashboard } from './dashboard.js';

dotenv.config();

/* -------- ERROR HANDLING -------- */
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

/* -------- START DASHBOARD -------- */
startDashboard();

/* -------- DEBUG ENV -------- */
console.log("TOKEN length:", process.env.TOKEN ? process.env.TOKEN.length : "MISSING");

/* -------- DISCORD CLIENT -------- */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

/* -------- READY EVENT -------- */
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

/* -------- LOGIN -------- */
(async () => {
  try {
    await client.login(process.env.TOKEN);
    console.log("✅ Discord login successful");
  } catch (err) {
    console.error("❌ Login failed:");
    console.error(err);
  }
})();
