import "dotenv/config";
import { Client } from "pg";
import { loadSchema, seedDatabase } from "./setup.js";

await client.connect();
  try {
    console.log("Rebuilding schema...");
    await loadSchema(client);

    console.log("Seeding data...");
    await seedDatabase(client);

    console.log("Seed complete.");
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();

