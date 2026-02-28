
import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } from 'discord.js';
import { Manager } from 'erela.js';
import dotenv from 'dotenv';
import { startDashboard } from './dashboard.js';
import { addPremium, isPremium } from './database.js';

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

const manager = new Manager({
  nodes: [{
    host: "pnode1.danbot.host",
    port: 1351,
    password: "cocaine",
    secure: false
  }],
  autoPlay: true,
  send(id, payload) {
    const guild = client.guilds.cache.get(id);
    if (guild) guild.shard.send(payload);
  }
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  manager.init(client.user.id);
  startDashboard(process.env.PORT || 3000);
});

client.on("raw", d => manager.updateVoiceState(d));

manager.on("nodeDisconnect", () => {
  console.log("Lavalink disconnected. Attempting reconnect...");
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const member = interaction.member;
  const voice = member.voice.channel;
  if (!voice) return interaction.reply({ content: "Join VC first.", ephemeral: true });

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

  if (interaction.commandName === "play") {
    const query = interaction.options.getString("song");
    const res = await manager.search(query, interaction.user);
    if (!res.tracks.length) return interaction.reply("No results.");
    player.queue.add(res.tracks);
    if (!player.playing) player.play();
    return interaction.reply(`Added to queue: ${res.tracks[0].title}`);
  }

  if (interaction.commandName === "queue") {
    const tracks = player.queue.slice(0, 10).map((t, i) => `${i+1}. ${t.title}`).join("\n");
    return interaction.reply(tracks || "Queue empty.");
  }

  if (interaction.commandName === "247") {
    if (!isPremium(interaction.user.id))
      return interaction.reply({ content: "Premium only feature.", ephemeral: true });
    player.set('247', true);
    return interaction.reply("24/7 Mode Enabled.");
  }

  if (interaction.commandName === "addpremium") {
    addPremium(interaction.options.getString("userid"));
    return interaction.reply("User added to premium.");
  }
});

const commands = [
  new SlashCommandBuilder().setName("play").setDescription("Play song")
    .addStringOption(o=>o.setName("song").setDescription("Song").setRequired(true)),
  new SlashCommandBuilder().setName("queue").setDescription("Show queue"),
  new SlashCommandBuilder().setName("247").setDescription("Enable 24/7 (Premium)"),
  new SlashCommandBuilder().setName("addpremium").setDescription("Add premium user")
    .addStringOption(o=>o.setName("userid").setDescription("User ID").setRequired(true))
].map(c=>c.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
await rest.put(
  Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
  { body: commands }
);

client.login(process.env.TOKEN);
