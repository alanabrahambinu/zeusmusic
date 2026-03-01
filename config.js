// config.js
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Discord Configuration
  token: process.env.TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  
  // Lavalink Configuration
  lavalink: {
    host: process.env.LAVALINK_HOST || "lava-v3.ajieblogs.eu.org",
    port: parseInt(process.env.LAVALINK_PORT) || 80,
    password: process.env.LAVALINK_PASSWORD || "https://dsc.gg/ajidevserver",
    secure: process.env.LAVALINK_SECURE === 'true' || false
  },
  
  // Server Configuration
  port: process.env.PORT || 10000,
  
  // Premium Database Configuration
  dbPath: process.env.DB_PATH || 'premium.db'
};
