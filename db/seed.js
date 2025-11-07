import db from "#db/client";

await db.connect();
await seed();
await db.end();
console.log("🌱 Database seeded.");

async function seed() {
  const products = [
    ["Acoustic Guitar", "Spruce top", 99],
    ["Electric Guitar", "Dual humbucker", 89],
    ["Drum Sticks", "Hickory (pair)", 11],
    ["Keyboard Stand", "Adjustable", 25],
    ["Microphone", "Vocal", 55],
    ["Guitar Strings", "Nickel wound", 18],
    ["Guitar Amp", "2x12 30W", 79],
    ["Tuner", "Chromatic", 33],
    ["Guitar Strap", "Multicolor", 13],
    ["Music Stand", "Folding", 29],
  ];

  try {
    await db.query("BEGIN");
  }
};

const userRes = await db.query(
  `
  INSERT INTO users (username, password
  VALUES ($1, $2)
  RETURNING id;
  `,
  ["testuser", "testpassword"]
);

const userID = userRes.rows[0].id;

const productInsertSQL = `
  INSERT INTO products (title, description, price)
  VALUES ${products}`
