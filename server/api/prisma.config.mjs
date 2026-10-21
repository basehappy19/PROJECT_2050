// Prisma: the database schema (prisma/schema.prisma), its migrations (prisma/migrations) and Prisma Studio.
// The connection comes from DATABASE_URL, the same variable the API uses.
import { defineConfig } from "prisma/config";
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL || "postgres://p2050:p2050@localhost:5432/p2050" },
});
