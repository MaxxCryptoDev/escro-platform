import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import proxy from 'express-http-proxy';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Proxy API calls to backend
app.use('/api', proxy('http://localhost:5000', {
  proxyReqPathResolver: (req) => {
    // req.url is like '/projects' when the full path is '/api/projects'
    // We need to return '/api/projects' to the backend
    return '/api' + req.url;
  },
  preserveHeaderKeyCase: true,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    // Explicitly forward Authorization header and other important headers
    if (srcReq.headers.authorization) {
      proxyReqOpts.headers.authorization = srcReq.headers.authorization;
    }
    return proxyReqOpts;
  },
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    // Add CORS headers if needed
    userRes.setHeader('Access-Control-Allow-Origin', '*');
    return proxyResData;
  }
}));

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback - serve index.html for all other routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend server running on port ${PORT}`);
});
