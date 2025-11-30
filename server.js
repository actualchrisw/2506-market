import { existsSync } from "node:fs";
import app from "./app.js";

if (typeof process.loadEnvFile === "function") {
  const envPath = new URL("./.env", import.meta.url);
  if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
  }
}

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Server listening on :${port}`));
