import express from 'express';
import { config } from './config.js';

const app = express();

app.get('/', (req, res) => {
  res.send('Zeus Music Bot Dashboard Running 🚀');
});

export function startDashboard() {
  const PORT = config.port;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dashboard running on port ${PORT}`);
  });
}
