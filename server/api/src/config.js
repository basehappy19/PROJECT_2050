// All settings come from environment variables (see ../.env.example).
const env = process.env;
export const config = {
  port: Number(env.PORT || 3000),
  databaseUrl: env.DATABASE_URL || "postgres://p2050:p2050@localhost:5432/p2050",
  jwtSecret: env.JWT_SECRET || "",
  googleClientId: (env.GOOGLE_CLIENT_ID || "").trim(),         // leave empty until you have a Google OAuth client
  corsOrigin: (env.CORS_ORIGIN || "*").split(",").map(s => s.trim()).filter(Boolean),
  publicUrl: (env.PUBLIC_URL || "").replace(/\/$/, ""),        // e.g. https://p2050.phukhieo.ac.th (used in certificate links)
  certMinCards: Number(env.CERT_MIN_CARDS || 20),
  certConfigPath: env.CERT_CONFIG || new URL("../../certificate/certificate.json", import.meta.url).pathname,
  minGameSeconds: Number(env.MIN_GAME_SECONDS || 300),         // games shorter than this earn no Terra
  logLevel: env.LOG_LEVEL || "info",
  timeZone: "Asia/Bangkok",
};
if (!config.jwtSecret || config.jwtSecret.length < 32){
  if (env.NODE_ENV === "production") throw new Error("JWT_SECRET must be set (at least 32 characters)");
  config.jwtSecret = config.jwtSecret || "dev-only-secret-change-me-dev-only-secret";
}
