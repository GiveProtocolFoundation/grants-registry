import type { Config } from "drizzle-kit";

export default {
  schema: "./app/db/schema.ts",
  out: "./app/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "./data/grants.sqlite",
  },
} satisfies Config;
