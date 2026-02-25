// Environment loaded via --env-file=.env.local in the npm script
import express from 'express';
import cors from 'cors';
import apiHandler from './api/[...route].js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Route all /api/* requests through the single catch-all handler
app.all('/api/*', apiHandler);

app.listen(PORT, () => {
  console.log(`Core Code API server running on http://localhost:${PORT}`);
});
