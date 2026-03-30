const { MongoClient } = require('mongodb');

async function run() {
  const uri = "mongodb://admin:password123@localhost:27017/";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db("next_local_db");
    const p = await db.collection("products").findOne({
      handle: "1-30-ct-solitaire-round-cut-spiral-setting-ring"
    });

    if (p) {
      console.log(`Product: ${p.handle}`);
      console.log(`Variants: ${JSON.stringify(p.variants, null, 2)}`);
      console.log(`Options: ${JSON.stringify(p.options, null, 2)}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

run();
