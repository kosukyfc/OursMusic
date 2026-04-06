module.exports = {
  apps: [
    {
      name: 'oursmusic-backend',
      script: 'C:\\Users\\Administrator\\Desktop\\Carai\\music-app\\backend\\dist\\src\\main.js',
    },
    {
      name: 'oursmusic-web',
      script: 'serve',
      interpreter: 'none',
      args: '-s C:\\xampp\\htdocs\\music -p 8080',
    },
  ],
};
