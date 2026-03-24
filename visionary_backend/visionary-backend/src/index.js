require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const authRoutes    = require('./routes/auth');
const studentRoutes = require('./routes/students');
const {
  marksRouter, attRouter, feesRouter,
  noticesRouter, teachersRouter, reportsRouter
} = require('./routes/resources');

const app = express();

// ── MIDDLEWARE ──────────────────────────────────────────────
app.use(cors({
  origin: [
    'https://radiant-duckanoo-265850.netlify.app',
    process.env.CLIENT_URL || 'http://localhost:3000'
  ],
  credentials: true
}));

app.use(express.json());

// Simple request logger in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ── ROUTES ──────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/students',   studentRoutes);
app.use('/api/teachers',   teachersRouter);
app.use('/api/marks',      marksRouter);
app.use('/api/attendance', attRouter);
app.use('/api/fees',       feesRouter);
app.use('/api/notices',    noticesRouter);
app.use('/api/reports',    reportsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error.' });
});

// ── START ───────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀  Visionary School API running on port ${PORT}`);
  console.log(`    http://localhost:${PORT}/api/health\n`);
});
