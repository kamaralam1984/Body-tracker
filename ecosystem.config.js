// PM2 process file for the bare-metal/VM deployment path (Ubuntu 24 LTS +
// PM2 + Nginx — see deploy/nginx/body-tracker.conf for the reverse proxy
// that sits in front of this). Run with:
//   npm run build && pm2 start ecosystem.config.js --env production
//   pm2 save && pm2 startup   # persist across reboots — see docs/ops/pm2-guide.md
module.exports = {
  apps: [
    {
      name: "body-tracker",
      script: ".next/standalone/server.js",
      cwd: __dirname,

      // Cluster mode load-balances across one worker per CPU core via
      // Node's built-in cluster module, all sharing a single listening
      // port — this is why Nginx only needs one upstream entry (see
      // deploy/nginx/body-tracker.conf's `upstream body_tracker_app`).
      exec_mode: "cluster",
      instances: "max",

      env: {
        NODE_ENV: "development",
        PORT: 3045,
        HOSTNAME: "127.0.0.1",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3045,
        HOSTNAME: "127.0.0.1",
        // BTK_JWT_SECRET, DATABASE_URL, REDIS_URL are read from the
        // real environment (systemd EnvironmentFile / a real .env this
        // file deliberately does NOT hardcode secrets into) — see
        // docs/ops/environment-variables.md.
      },

      // Restart policy.
      autorestart: true,
      max_restarts: 10,
      min_uptime: "30s",
      restart_delay: 2000,
      exp_backoff_restart_delay: 200,

      // Memory ceiling per worker — restart a worker if it leaks past this
      // rather than letting one bad worker degrade the whole cluster.
      max_memory_restart: "512M",

      // Next.js's standalone server.js never calls process.send('ready'),
      // so `wait_ready` would just add a dead listen_timeout delay to every
      // reload without the confirmation it's meant to provide — confirmed
      // by actually running this under PM2 6.0.14. `kill_timeout` alone
      // still gives in-flight requests time to finish on graceful reload
      // (`pm2 reload body-tracker`, one worker at a time in cluster mode).
      // True readiness gating happens at the Nginx/LB layer via
      // /api/v1/health/ready — see docs/ops/pm2-guide.md.
      kill_timeout: 5000,

      // Logs — see docs/ops/monitoring-guide.md for pm2-logrotate setup
      // (`pm2 install pm2-logrotate`), which is a PM2 module, not an npm
      // dependency of this app, so it isn't in package.json.
      out_file: "logs/pm2/out.log",
      error_file: "logs/pm2/error.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      // process.env.PORT/HOSTNAME rely on the standalone server.js
      // respecting them; see docs/ops/docker-guide.md for how the
      // Docker path (Dockerfile) reads the same two variables.
    },
  ],
};
