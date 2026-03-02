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
    host: process.env.LAVALINK_HOST || "45.13.236.245",
    port: parseInt(process.env.LAVALINK_PORT) || 25582,
    password: process.env.LAVALINK_PASSWORD || "glace",
    secure: process.env.LAVALINK_SECURE === 'true' || false
  },
  
  // Server Configuration
  port: process.env.PORT || 10000,
  
  // Premium Database Configuration
  dbPath: process.env.DB_PATH || 'premium.db'
};
