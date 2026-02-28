import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } from 'discord.js';
import { Manager } from 'erela.js';
import dotenv from 'dotenv';
import { startDashboard } from './dashboard.js';
import { addPremium, isPremium } from './database.js';

dotenv.config();

/* -------------------- START DASHBOARD IMMEDIATELY (RENDER FIX) -------------------- */
startDashboard(); // 🔥 This must run BEFORE Discord login

/* -------------------- DISCORD CLIENT -------------------- */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

/* -------------------- LAVALINK MANAGER -------------------- */
const manager = new Manager({
  nodes: [
    {
      host: "pnode1.danbot.host",
      port: 1351,
      password: "cocaine",
      secure: false
    }
  ],
  autoPlay: true,
  send(id, payload) {
    const guild = client.guilds.cache.get(id);
    if (guild) guild.shard.send(payload);
  }
});

/* -------------------- READY EVENT -------------------- */
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  manager.init(client.user.id);
});

/* -------------------- VOICE STATE -------------------- */
client.on("raw", d => manager.updateVoiceState(d));

manager.on("nodeDisconnect", () => {
  console.log("Lavalink disconnected. Attempting reconnect...");
});

/* -------------------- INTERACTIONS -------------------- */
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const member = interaction.member;
  const voice = member.voice.channel;

  if (!voice)
    return interaction.reply({ content: "Join a voice channel first.", ephemeral: true });

  let player = manager.players.get(interaction.guild.id);

  if (!player) {
    player = manager.create({
      guild: interaction.guild.id,
      voiceChannel: voice.id,
      textChannel: interaction.channel.id,
      selfDeafen: true
    });
    player.connect();
  }

  /* -------- PLAY -------- */
  if (interaction.commandName === "play") {
    const query = interaction.options.getString("song");
    const res = await manager.search(query, interaction.user);

    if (!res.tracks.length)
      return interaction.reply("No results found.");

    player.queue.add(res.tracks[0]);

    if (!player.playing && !player.paused)
      player.play();

    return interaction.reply(`🎵 Added to queue: **${res.tracks[0].title}**`);
  }

  /* -------- QUEUE -------- */
  if (interaction.commandName === "queue") {
    if (!player || !player.queue.size)
      return interaction.reply("Queue is empty.");

    const tracks = player.queue
      .slice(0, 10)
      .map((t, i) => `${i + 1}. ${t.title}`)
      .join("\n");

    return interaction.reply(`📜 **Queue:**\n${tracks}`);
  }

  /* -------- 24/7 MODE (PREMIUM) -------- */
  if (interaction.commandName === "247") {
    if (!isPremium(interaction.user.id))
      return interaction.reply({ content: "❌ Premium only feature.", ephemeral: true });

    player.set("247", true);
    return interaction.reply("✅ 24/7 Mode Enabled.");
  }

  /* -------- ADD PREMIUM -------- */
  if (interaction.commandName === "addpremium") {
    addPremium(interaction.options.getString("userid"));
    return interaction.reply("✅ User added to premium.");
  }
});

/* -------------------- SLASH COMMAND REGISTRATION -------------------- */
const commands = [
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a song")
    .addStringOption(o =>
      o.setName("song")
        .setDescription("Song name or YouTube link")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Show current queue"),

  new SlashCommandBuilder()
    .setName("247")
    .setDescription("Enable 24/7 mode (Premium)"),

  new SlashCommandBuilder()
    .setName("addpremium")
    .setDescription("Add a user to premium list")
    .addStringOption(o =>
      o.setName("userid")
        .setDescription("User ID")
        .setRequired(true)
    )

].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
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
})();

/* -------------------- LOGIN -------------------- */
client.login(process.env.TOKEN);
