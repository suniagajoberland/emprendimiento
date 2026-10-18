const path = require('path');

module.exports = {
  port: Number(process.env.PORT) || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'avellvis-local-secret-change-me',
  sessionMaxAgeMs: 1000 * 60 * 60 * 8,
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'dashboard.db'),
  rateRefreshMs: 1000 * 60 * 60 * 6,
  displayTz: process.env.DASHBOARD_TZ || 'America/Caracas'
};
