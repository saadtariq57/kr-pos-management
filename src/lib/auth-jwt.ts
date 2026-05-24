import jwt from "jsonwebtoken";

export type AuthTokenPayload = {
  sub: string; // user id
  email: string;
  name: string;
  role: string;
};

const JWT_SECRET = process.env.JWT_SECRET;

export function signAuthToken(payload: AuthTokenPayload) {
  if (!JWT_SECRET) {
    throw new Error("Missing JWT_SECRET. Add it to .env.local");
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  if (!JWT_SECRET) {
    throw new Error("Missing JWT_SECRET. Add it to .env.local");
  }
  const decoded = jwt.verify(token, JWT_SECRET);
  if (!decoded || typeof decoded !== "object") {
    throw new Error("Invalid token");
  }
  const obj = decoded as any;
  return {
    sub: String(obj.sub),
    email: String(obj.email),
    name: String(obj.name),
    role: String(obj.role),
  };
}

