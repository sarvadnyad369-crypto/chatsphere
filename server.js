const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Serve index.html for all routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// API endpoints (for future backend features)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  // Add your authentication logic here
  res.json({ success: true, message: 'Login successful', user: { username } });
});

app.post('/api/register', (req, res) => {
  const { username, displayName, password } = req.body;
  // Add your registration logic here
  res.json({ success: true, message: 'Registration successful' });
});

app.post('/api/send-message', (req, res) => {
  const { to, message } = req.body;
  // Add your message handling logic here
  res.json({ success: true, message: 'Message sent' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`ChatSphere server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});