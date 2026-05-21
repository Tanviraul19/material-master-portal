const express = require('express');
const cors = require('cors');
require('dotenv').config();
const initDB = require('./config/initDB');

const authRoutes = require('./routes/authRoutes');
const requestRoutes = require('./routes/requestRoutes');
const statsRoutes = require('./routes/statsRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const duplicateRoutes = require('./routes/duplicateRoutes');
const masterRoutes = require('./routes/masterRoutes');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/duplicate', duplicateRoutes);
app.use('/api/master', masterRoutes);

// Basic health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'Material Master API is running' });
});

// Run DB Initialization and Start Server
const startServer = async () => {
  try {
    await initDB();
    
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    // Keep event loop alive
    setInterval(() => {
      // Just checking if server is still up
    }, 10000);

  } catch (err) {
    console.error('Failed to start server:', err);
  }
};

startServer();
