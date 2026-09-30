import dotenv from "dotenv";

dotenv.config();

const nodeEnv = process.env.NODE_ENV ?? "development";
const isDev = nodeEnv !== "production";

const DEV_JWT_SECRET = "dev-only-secret-change-me";
const jwtSecret = process.env.JWT_SECRET ?? DEV_JWT_SECRET;

if (!isDev && jwtSecret === DEV_JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in production");
}

export const env = {
  nodeEnv,
  isDev,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/samvahak",
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
    apiKey: process.env.CLOUDINARY_API_KEY ?? "",
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? "",
    // Check https://ai.google.dev/gemini-api/docs/models for the current stable model -
    // Gemini model names/aliases are retired on a rolling basis, so this may need updating.
    model: process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite",
  },
};
