import { existsSync } from "node:fs"

import { defineConfig } from "drizzle-kit"

if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local")
} else if (existsSync(".env.development.local")) {
  process.loadEnvFile(".env.development.local")
}

export default defineConfig({
  schema: "./db/schema.ts",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    // Direct (non-pooled) connection: schema changes need session state
    url: process.env.DATABASE_URL_UNPOOLED!,
  },
})
