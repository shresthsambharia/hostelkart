import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

router.get('/', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  let dbStatusString = 'unknown';

  switch (dbStatus) {
    case 0:
      dbStatusString = 'disconnected';
      break;
    case 1:
      dbStatusString = 'connected';
      break;
    case 2:
      dbStatusString = 'connecting';
      break;
    case 3:
      dbStatusString = 'disconnecting';
      break;
  }

  const isHealthy = dbStatus === 1;

  const healthData = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    database: {
      status: dbStatusString,
      connected: dbStatus === 1,
    },
    system: {
      platform: process.platform,
      nodeVersion: process.version,
    }
  };

  res.status(isHealthy ? 200 : 500).json(healthData);
});

export default router;
