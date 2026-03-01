import express from "express";
import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } from "discord.js";
import { Manager } from "erela.js";
import { config } from "./config.js";

/* ================= EXPRESS SERVER (RENDER FIX) ================= */
const app = express();
const PORT = config.port;

app.get("/", (req, res) => {
  res.send("Zeus Music Bot Running 🚀");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});

/* ================= ERROR HANDLING ================= */
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

/* ================= DISCORD CLIENT ================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

/* ================= LAVALINK MANAGER ================= */
const manager = new Manager({
  nodes: [
    {
      host: config.lavalink.host,
      port: config.lavalink.port,
      password: config.lavalink.password,
      secure: config.lavalink.secure
    }
  ],
  autoPlay: true,
  send(id, payload) {
    const guild = client.guilds.cache.get(id);
    if (guild) guild.shard.send(payload);
  }
});

/* ================= READY EVENT ================= */
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  manager.init(client.user.id);

  // Slash command registration
  const commands = [
    new SlashCommandBuilder()
      .setName("play")
      .setDescription("Play a song from YouTube")
      .addStringOption(option =>
        option.setName("song")
          .setDescription("Song name or YouTube URL")
          .setRequired(true)
      )
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: "10" }).setToken(config.token);

  try {
    await rest.put(
      Routes.applicationGuildCommands(
        config.clientId,
        config.guildId
      ),
      { body: commands }
    );
    console.log("✅ Slash commands registered");
  } catch (err) {
    console.error("❌ Slash registration error:", err);
  }
});

/* ================= VOICE STATE ================= */
client.on("raw", d => manager.updateVoiceState(d));

/* ================= LAVALINK EVENTS ================= */
manager.on("nodeConnect", node => {
  console.log(`✅ Lavalink connected: ${node.options.host}`);
});

manager.on("nodeError", (node, error) => {
  console.error("❌ Lavalink error:", error);
});

manager.on("nodeDisconnect", (node) => {
  console.log("⚠️ Lavalink disconnected. Reconnecting...");
});

/* ================= PLAY COMMAND ================= */
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "play") {

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel)
      return interaction.reply({
        content: "❌ Join a voice channel first.",
        ephemeral: true
      });

    let player = manager.players.get(interaction.guild.id);

    if (!player) {
      player = manager.create({
        guild: interaction.guild.id,
        voiceChannel: voiceChannel.id,
        textChannel: interaction.channel.id,
        selfDeafen: true
      });
      player.connect();
    }

    const query = interaction.options.getString("song");
    const result = await manager.search(query, interaction.user);

    if (!result.tracks.length)
      return interaction.reply("❌ No results found.");

    player.queue.add(result.tracks[0]);

    if (!player.playing && !player.paused)
      player.play();

    return interaction.reply(`🎵 Now Playing: **${result.tracks[0].title}**`);
  }
});

/* ================= LOGIN ================= */
client.login(config.token)
  .then(() => console.log("✅ Discord login successful"))
  .catch(err => console.error("❌ Login error:", err));
