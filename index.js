import express from "express";
import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } from "discord.js";
import { Manager } from "erela.js";
import { config } from "./config.js";

/* ================= EXPRESS SERVER ================= */
const app = express();
const PORT = config.port;

app.get("/", (req, res) => {
  res.send("Zeus Music Bot Running 🚀");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});

/* ================= ERROR HANDLING ================= */
process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled Rejection:", error);
});
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
});

/* ================= DISCORD CLIENT ================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

/* ================= LAVALINK MANAGER ================= */
// Create nodes array with primary + fallbacks
const nodes = [
  {
    host: config.lavalink.host,
    port: config.lavalink.port,
    password: config.lavalink.password,
    secure: config.lavalink.secure,
    retryDelay: 5000,
    timeout: 10000
  },
  ...config.lavalink.fallback
];

const manager = new Manager({
  nodes,
  autoPlay: true,
  send(id, payload) {
    const guild = client.guilds.cache.get(id);
    if (guild) guild.shard.send(payload);
  }
});

/* ================= LAVALINK EVENTS ================= */
manager.on("nodeConnect", (node) => {
  console.log(`✅ Lavalink connected: ${node.options.host}:${node.options.port}`);
});

manager.on("nodeReady", (node) => {
  console.log(`✅ Lavalink ready: ${node.options.host}:${node.options.port}`);
});

manager.on("nodeError", (node, error) => {
  console.error(`❌ Lavalink error on ${node.options.host}:`, error.message);
  
  // Try to reconnect
  if (!node.connected) {
    console.log(`🔄 Attempting to reconnect to ${node.options.host}...`);
    setTimeout(() => node.connect(), 5000);
  }
});

manager.on("nodeDisconnect", (node) => {
  console.log(`⚠️ Lavalink disconnected: ${node.options.host}`);
});

manager.on("nodeReconnect", (node) => {
  console.log(`🔄 Lavalink reconnecting: ${node.options.host}`);
});

// Handle raw messages
manager.on("raw", (data) => {
  if (data?.op === "ready") {
    console.log("✅ Lavalink ready event received");
  }
});

/* ================= READY EVENT ================= */
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // Initialize manager
  manager.init(client.user.id);

  // Register slash commands
  const commands = [
    new SlashCommandBuilder()
      .setName("play")
      .setDescription("Play a song from YouTube")
      .addStringOption(option =>
        option.setName("song")
          .setDescription("Song name or YouTube URL")
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("stop")
      .setDescription("Stop the music and clear the queue"),
    new SlashCommandBuilder()
      .setName("skip")
      .setDescription("Skip the current song"),
    new SlashCommandBuilder()
      .setName("queue")
      .setDescription("Show the current queue"),
    new SlashCommandBuilder()
      .setName("pause")
      .setDescription("Pause the current song"),
    new SlashCommandBuilder()
      .setName("resume")
      .setDescription("Resume the paused song")
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: "10" }).setToken(config.token);

  try {
    if (config.guildId) {
      // Register for specific guild (faster for testing)
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands }
      );
      console.log(`✅ Slash commands registered for guild ${config.guildId}`);
    } else {
      // Register globally
      await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commands }
      );
      console.log("✅ Slash commands registered globally");
    }
  } catch (err) {
    console.error("❌ Slash registration error:", err);
  }
});

/* ================= VOICE STATE ================= */
client.on("raw", (d) => manager.updateVoiceState(d));

/* ================= PLAY COMMAND ================= */
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  // Play command
  if (commandName === "play") {
    await interaction.deferReply();

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.editReply("❌ Join a voice channel first.");
    }

    // Check permissions
    const permissions = voiceChannel.permissionsFor(client.user);
    if (!permissions.has("Connect") || !permissions.has("Speak")) {
      return interaction.editReply("❌ I need permissions to connect and speak in your voice channel.");
    }

    let player = manager.players.get(interaction.guild.id);

    if (!player) {
      player = manager.create({
        guild: interaction.guild.id,
        voiceChannel: voiceChannel.id,
        textChannel: interaction.channel.id,
        selfDeafen: true,
      });
      player.connect();
    }

    const query = interaction.options.getString("song");
    
    try {
      const result = await manager.search(query, interaction.user);

      if (result.loadType === "LOAD_FAILED") {
        return interaction.editReply("❌ Failed to load the song.");
      }

      if (!result.tracks.length) {
        return interaction.editReply("❌ No results found.");
      }

      const track = result.tracks[0];
      player.queue.add(track);

      if (!player.playing && !player.paused && !player.queue.size) {
        player.play();
      }

      return interaction.editReply(`🎵 Added to queue: **${track.title}**`);
    } catch (error) {
      console.error("Play command error:", error);
      return interaction.editReply("❌ An error occurred while searching.");
    }
  }

  // Stop command
  if (commandName === "stop") {
    const player = manager.players.get(interaction.guild.id);
    if (!player) {
      return interaction.reply("❌ No music is currently playing.");
    }
    
    player.destroy();
    return interaction.reply("⏹️ Stopped the music and cleared the queue.");
  }

  // Skip command
  if (commandName === "skip") {
    const player = manager.players.get(interaction.guild.id);
    if (!player) {
      return interaction.reply("❌ No music is currently playing.");
    }
    
    player.stop();
    return interaction.reply("⏭️ Skipped the current song.");
  }

  // Queue command
  if (commandName === "queue") {
    const player = manager.players.get(interaction.guild.id);
    if (!player || !player.queue.current) {
      return interaction.reply("❌ No music is currently playing.");
    }

    const queue = player.queue;
    const current = queue.current;
    
    let queueList = `**Now Playing:** ${current.title}\n\n`;
    
    if (queue.length > 0) {
      queueList += "**Queue:**\n";
      queue.forEach((track, index) => {
        if (index < 10) { // Show only first 10 songs
          queueList += `${index + 1}. ${track.title}\n`;
        }
      });
      
      if (queue.length > 10) {
        queueList += `... and ${queue.length - 10} more songs.`;
      }
    } else {
      queueList += "The queue is empty.";
    }

    return interaction.reply(queueList);
  }

  // Pause command
  if (commandName === "pause") {
    const player = manager.players.get(interaction.guild.id);
    if (!player) {
      return interaction.reply("❌ No music is currently playing.");
    }
    
    if (player.paused) {
      return interaction.reply("❌ Music is already paused.");
    }
    
    player.pause(true);
    return interaction.reply("⏸️ Paused the music.");
  }

  // Resume command
  if (commandName === "resume") {
    const player = manager.players.get(interaction.guild.id);
    if (!player) {
      return interaction.reply("❌ No music is currently playing.");
    }
    
    if (!player.paused) {
      return interaction.reply("❌ Music is already playing.");
    }
    
    player.pause(false);
    return interaction.reply("▶️ Resumed the music.");
  }
});

// Track events
manager.on("trackStart", (player, track) => {
  const channel = client.channels.cache.get(player.textChannel);
  if (channel) {
    channel.send(`🎵 Now playing: **${track.title}**`);
  }
});

manager.on("queueEnd", (player) => {
  const channel = client.channels.cache.get(player.textChannel);
  if (channel) {
    channel.send("✅ Queue ended. Leaving voice channel.");
  }
  player.destroy();
});

manager.on("trackError", (player, track, error) => {
  console.error("Track error:", error);
  const channel = client.channels.cache.get(player.textChannel);
  if (channel) {
    channel.send("❌ An error occurred while playing the track.");
  }
  player.stop();
});

/* ================= LOGIN ================= */
client.login(config.token)
  .then(() => console.log("✅ Discord login successful"))
  .catch(err => console.error("❌ Login error:", err));
