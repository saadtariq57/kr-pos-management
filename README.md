# KR Restaurant - POS & Management Workspace

A calm, high-fidelity point-of-sale and kitchen real-time management workspace for KR Restaurant. Built with Next.js, MongoDB, and real-time Socket.io WebSockets.

---

## Development Setup Guide

### 1. Prerequisite Installations
- **Node.js** (v18.x or higher recommended)
- **MongoDB** (Local Compass or Atlas URI)

### 2. Environment Variables Configuration
Create a `.env` file in the root directory and copy the contents from `.env.example`. Customize the values:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/kr-pos
JWT_SECRET=replace-with-a-long-random-string

# Server ports — change these to run on different ports
PORT=3000
WEBSOCKET_PORT=3002

APP_URL=http://localhost:3000
NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3002

# SendGrid & Cloudinary Credentials (as needed)
...
```

> **How ports work:** All npm scripts use [`dotenv-cli`](https://www.npmjs.com/package/dotenv-cli) to load `.env` before starting any server. This means `PORT` and `WEBSOCKET_PORT` are injected into the process environment *before* the server binds — so changing a port is as simple as editing `.env`. No changes to `package.json` or any code are needed.

### 3. Run Development Servers
Open two terminal windows:

#### **Next.js Web POS & Management App**
```bash
npm run dev
```
Starts on the port defined by `PORT` in `.env` (default: `3000`).

#### **WebSocket Notification Server**
```bash
npm run dev:ws
```
Starts on the port defined by `WEBSOCKET_PORT` in `.env` (default: `3002`). Uses nodemon for hot-reloads.

---

## Production Setup Guide

Both the Next.js POS app and the Socket.io WebSocket notification server are fully ready for a robust production environment.

### 1. Configure Production Environment Variables
Set the following in your production `.env` file (or your hosting provider's env config):
- `PORT`: Port for the Next.js server (defaults to `3000`).
- `WEBSOCKET_PORT`: Port for the WebSocket server (defaults to `3002`).
- `MONGODB_URI`: Point to your production MongoDB database cluster.
- `JWT_SECRET`: A secure, cryptographically random secret string.
- `APP_URL`: Your deployed website URL (e.g. `https://kr-restaurant.example.com`).
- `NEXT_PUBLIC_WEBSOCKET_URL`: Public absolute URL of your deployed WebSocket server (e.g., `https://kr-restaurant.example.com:3002`).

### 2. Next.js POS Server
Build the optimized production bundle and start the server:
```bash
# 1. Compile and build production assets
npm run build

# 2. Start the Next.js production server (port from PORT in .env)
npm run start
```

### 3. WebSocket Notification Server
```bash
# Start the WebSocket server (port from WEBSOCKET_PORT in .env)
npm run start:ws
```

### 4. Process Manager (Recommended for VPS Setup)
If deploying on a VPS (like Ubuntu via DigitalOcean/AWS), use **PM2** with our industry-standard ecosystem configuration file to manage both processes and keep them running continuously:

```bash
# 1. Install PM2 globally
npm install -g pm2

# 2. Start both services together (from your project directory)
pm2 start ecosystem.config.cjs

# 3. Save PM2 process list and configure startup
pm2 save
pm2 startup
```

Once started, PM2 registers the absolute paths and you can run status, logs, or management commands **from any directory** on your server:
```bash
pm2 status          # View status of both apps
pm2 logs            # Stream real-time logs
pm2 restart all     # Restart both services
pm2 stop all        # Stop both services
```
