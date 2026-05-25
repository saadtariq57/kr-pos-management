module.exports = {
  apps: [
    {
      name: "kr-next-pos",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "./",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "kr-websocket",
      script: "websocket/server.js",
      cwd: "./",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
