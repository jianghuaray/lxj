module.exports = {
  apps: [
    {
      name: 'lexiujiang',
      script: 'src/app.js',
      cwd: '/opt/lexiujiang/backend',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      error_file: '/opt/lexiujiang/logs/error.log',
      out_file: '/opt/lexiujiang/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
