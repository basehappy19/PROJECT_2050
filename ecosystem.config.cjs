// PM2: pm2 start ecosystem.config.cjs  (run from the project root, after `npm run setup` and `npm run build`)
// Ports and settings come from .env, the same as `npm start`.
module.exports = {
  apps: [{
    name: "project-zero",
    script: "scripts/start.mjs",
    cwd: __dirname,
    instances: 1,                 // one copy only: it already runs the game, the admin page and the API
    autorestart: true,
    max_restarts: 50,
    restart_delay: 3000,
    kill_timeout: 5000,
    time: true,                   // timestamps in the logs
    env: { NODE_ENV: "production" },
  }],
};
