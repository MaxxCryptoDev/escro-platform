import express from 'express';

const app = express();
const PORT = 5000;

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

setTimeout(() => {
  console.log('Test complete');
  server.close();
  process.exit(0);
}, 2000);
