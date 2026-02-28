import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { startDashboard } from './dashboard.js';
import { addPremium, isPremium } from './database.js';

dotenv.config();

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

/* ---------------- START DASHBOARD ---------------- */
startDashboard();

console.log("TOKEN exists:", !!process.env.TOKEN);

/* ---------------- DISCORD CLIENT ---------------- */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

/* ---------------- READY EVENT ---------------- */
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Register slash commands AFTER login
  const commands = [
    new SlashCommandBuilder()
      .setName("play")
      .setDescription("Test command")
      .addStringOption(o =>
        o.setName("song")
          .setDescription("Song name")
          .setRequired(true)
      )
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  try {
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );
    console.log("Slash commands registered.");
  } catch (err) {
    console.error(err);
  }
});

/* ---------------- LOGIN ---------------- */
client.login(process.env.TOKEN)
  .then(() => console.log("Discord login successful"))
  .catch(err => console.error("Login error:", err));
