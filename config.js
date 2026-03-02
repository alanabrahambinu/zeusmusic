// config.js
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Discord Configuration
  token: process.env.TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  
  // Lavalink Configuration - Multiple nodes for fallback
  lavalink: {
    // Primary node
    host: process.env.LAVALINK_HOST || "45.13.236.245",
    port: parseInt(process.env.LAVALINK_PORT) || 25582,
    password: process.env.LAVALINK_PASSWORD || "glace",
    secure: process.env.LAVALINK_SECURE === 'true' || false,
    
    // Fallback nodes (will be used if primary fails)
    fallback: [
      {
        host: "lava.link",
        port: 80,
        password: "anything",
        secure: false
      },
      {
        host: "lavalink.oops.wtf",
        port: 443,
        password: "www.freelavalink.ga",
        secure: true
      }
    ]
  },
  
  // Server Configuration
  port: process.env.PORT || 10000,
  
  // Premium Database Configuration
  dbPath: process.env.DB_PATH || 'premium.db'
};
