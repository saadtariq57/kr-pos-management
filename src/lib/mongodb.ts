import mongoose from "mongoose";

/**
 * MongoDB connection for server-side code (Route Handlers, Server Actions).
 * Set MONGODB_URI in `.env.local` — never commit real passwords.
 *
 * Local (Compass / mongod on default port):
 * mongodb://127.0.0.1:27017/kr-pos
 *
 * Atlas:
 * mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/kr-pos?appName=Cluster0
 */
const MONGODB_URI = process.env.MONGODB_URI;

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as unknown as {
  mongooseCache?: MongooseCache;
};

function getCache(): MongooseCache {
  if (!globalForMongoose.mongooseCache) {
    globalForMongoose.mongooseCache = { conn: null, promise: null };
  }
  return globalForMongoose.mongooseCache;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error(
      "Missing MONGODB_URI. Add it to .env.local.",
    );
  }

  const cached = getCache();

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export function getMongoUriConfigured(): boolean {
  return Boolean(MONGODB_URI && MONGODB_URI.length > 0);
}
