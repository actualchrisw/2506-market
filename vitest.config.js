import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { defineConfig } from "vitest/config";

const envPath = ".env";
const fileEnv = existsSync(envPath) ? loadEnvFile(envPath) : {};
const envVars = {
  DATABASE_URL: fileEnv.DATABASE_URL ?? process.env.DATABASE_URL ?? "",
  JWT_SECRET: fileEnv.JWT_SECRET ?? process.env.JWT_SECRET ?? "test-secret",
  BCRYPT_SALT_ROUNDS:
    fileEnv.BCRYPT_SALT_ROUNDS ?? process.env.BCRYPT_SALT_ROUNDS ?? "1",
  NODE_ENV: "test",
};

export default defineConfig(() => ({
  test: {
    env: envVars,
  },
}));
