import express from 'express';

const app = express();

app.get('/', (req, res) => {
  res.send('Zeus Music Bot Dashboard Running 🚀');
});

export function startDashboard() {
  const PORT = process.env.PORT || 10000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dashboard running on port ${PORT}`);
  });
}
