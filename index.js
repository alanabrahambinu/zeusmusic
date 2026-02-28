import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } from "discord.js";
import { Manager } from "erela.js";
import dotenv from "dotenv";

dotenv.config();

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
      host: "pnode1.danbot.host",
      port: 1351,
      password: "cocaine",
      secure: false
    }
  ],
  send(id, payload) {
    const guild = client.guilds.cache.get(id);
    if (guild) guild.shard.send(payload);
  }
});

/* ================= READY EVENT ================= */
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  manager.init(client.user.id);

  // Register Slash Commands AFTER login
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

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  try {
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );
    console.log("✅ Slash commands registered");
  } catch (err) {
    console.error("❌ Slash registration error:", err);
  }
});

/* ================= LAVALINK EVENTS ================= */
client.on("raw", d => manager.updateVoiceState(d));

manager.on("nodeConnect", () => {
  console.log("✅ Lavalink connected");
});

manager.on("nodeError", (node, error) => {
  console.error("❌ Lavalink error:", error);
});

/* ================= COMMAND HANDLER ================= */
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
client.login(process.env.TOKEN)
  .then(() => console.log("✅ Discord login successful"))
  .catch(err => console.error("❌ Login error:", err));
