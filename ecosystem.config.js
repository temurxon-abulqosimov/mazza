module.exports = {
  apps: [{
    name: 'telegram-bot',
    script: 'dist/main.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    // Restart on file changes (optional)
    watch: ['dist'],
    ignore_watch: ['node_modules', 'logs'],
    // Graceful shutdown
    kill_timeout: 5000,
    // Wait for app to be ready
    listen_timeout: 8000
  }]
}; 