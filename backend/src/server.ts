import { createApp } from './app.js';

const PORT = parseInt(process.env.PORT || '4000', 10);
const { app } = createApp();

app.listen(PORT, () => {
  console.log(`🚀 Last-Mile Logistics Server running on port ${PORT}`);
});
