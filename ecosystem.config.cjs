module.exports = {
  apps: [
    {
      name: 'observe-api',
      script: 'server.js',
      watch: ['server.js', 'routes', 'lib'],
      ignore_watch: ['node_modules', 'src', 'dist', '.git', '*.log'],
      watch_delay: 1000,
      autorestart: true,
      restart_delay: 2000,
      kill_timeout: 3000,
    },
    {
      name: 'observe-ui',
      script: 'npx',
      args: 'vite --host',
      autorestart: true,
      watch: false,
    },
  ],
}
