require("dotenv").config({ path: "./.env" });

const PORT = process.env.PORT || "3000";
const WEBSOCKET_PORT = process.env.WEBSOCKET_PORT || "3002";

module.exports = {
  apps: [
    {
      name: "kr-next-pos",
      script: "node_modules/next/dist/bin/next",
      args: `start -p ${PORT}`,
      cwd: "./",
      env_file: "./.env",
      env: {
        NODE_ENV: "production",
        PORT,
      },
    },
    {
      name: "kr-websocket",
      script: "websocket/server.js",
      cwd: "./",
      env_file: "./.env",
      env: {
        NODE_ENV: "production",
        WEBSOCKET_PORT,
      },
    },
  ],
};
