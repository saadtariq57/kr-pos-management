# KR Restaurant - POS & Management Workspace

A calm, high-fidelity point-of-sale and kitchen real-time management workspace for KR Restaurant. Built with Next.js, MongoDB, and real-time Socket.io WebSockets.

---

## Development Setup Guide

### 1. Prerequisite Installations
- **Node.js** (v18.x or higher recommended)
- **MongoDB** (Local Compass or Atlas URI)

### 2. Environment Variables Configuration
Create a `.env` or `.env.local` file in the root directory and copy the contents from `.env.example`. Customize the values:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/kr-pos
JWT_SECRET=replace-with-a-long-random-string
APP_URL=http://localhost:3000
WEBSOCKET_PORT=3002

# SendGrid & Cloudinary Credentials (as needed)
...
```

### 3. Run Development Servers
Open two terminal windows or run concurrently:

#### **Next.js Web POS & Management App**
Starts the local development server:
```bash
npm run dev
```

#### **WebSocket Notification Server**
Starts the Socket.io WebSocket server on port `3002` (via nodemon for hot-reloads):
```bash
npm run dev:ws
```

---

## Production Setup Guide

Both the Next.js POS app and the Socket.io WebSocket notification server are fully ready for a robust production environment.

### 1. Configure Production Environment Variables
Set the following environment variables on your production hosting environments (Vercel, Render, Heroku, AWS, or PM2 VPS):
- `MONGODB_URI`: Point to your production MongoDB database cluster.
- `JWT_SECRET`: A secure, cryptographically random secret string.
- `APP_URL`: Your deployed website URL (e.g. `https://kr-restaurant.example.com`).
- `WEBSOCKET_PORT`: Port for the WebSocket server (defaults to `3002`).
- `NEXT_PUBLIC_WEBSOCKET_URL`: Public absolute URL of your deployed WebSocket server (e.g., `https://websocket-kr.example.com` or `wss://kr-restaurant.example.com`). This ensures the client connects dynamically without local host hardcoding.

### 2. Next.js POS Server
Build the optimized production bundle and start the server:
```bash
# 1. Compile and build production assets
npm run build

# 2. Start the Next.js production server
npm run start
```

### 3. WebSocket Notification Server
Start the standalone Node.js Socket.io server directly in a secure, non-development environment:
```bash
# Start the WebSocket server using standard Node.js
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
