module.exports = {
  apps: [
    {
      name: "kr-next-pos",
      script: "npm",
      args: "run start",
      cwd: "./",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "kr-websocket",
      script: "npm",
      args: "run start:ws",
      cwd: "./",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
