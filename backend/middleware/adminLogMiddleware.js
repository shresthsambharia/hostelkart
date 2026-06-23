import asyncHandler from 'express-async-handler';
import AdminLog from '../models/AdminLog.js';

const logAdminActivity = asyncHandler(async (req, res, next) => {
  // Only log write actions (POST, PUT, DELETE)
  if (req.method !== 'GET') {
    // Setup finished listener to capture final status code or log post-completion details
    res.on('finish', async () => {
      // Check if user is authenticated and is an admin
      if (req.user && req.user.role === 'admin') {
        try {
          // Construct action description
          let action = `${req.method} ${req.originalUrl}`;
          let details = {
            body: { ...req.body },
            statusCode: res.statusCode,
          };

          // Redact passwords if any
          if (details.body.password) details.body.password = '***REDACTED***';

          await AdminLog.create({
            admin: req.user._id,
            action,
            method: req.method,
            url: req.originalUrl,
            ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            userAgent: req.headers['user-agent'],
            details,
          });
        } catch (err) {
          console.error('[Admin Audit Log Middleware Error]', err);
        }
      }
    });
  }
  next();
});

export { logAdminActivity };
