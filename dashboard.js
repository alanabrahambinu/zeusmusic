
import express from 'express';
const app = express();

app.get('/', (req, res) => {
  res.send('<h1>Ultimate Music Bot Dashboard</h1><p>Bot is running successfully.</p>');
});

export function startDashboard(port) {
  app.listen(port, () => console.log(`Dashboard running on port ${port}`));
}
