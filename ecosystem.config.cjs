module.exports = {
  apps: [
    {
      name: 'lexiujiang',
      script: 'src/app.js',
      cwd: '/opt/lexiujiang/backend',
      env_production: {
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      error_file: '/opt/lexiujiang/logs/error-0.log',
      out_file: '/opt/lexiujiang/logs/out-0.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
