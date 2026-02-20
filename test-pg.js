const { Client } = require('pg');

const url = "postgres://postgres.pakjnadgcyshcnzpbwhs:knATMWj0dryG9CP6@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require";

async function run() {
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    const res = await client.query('SELECT 1 as result');
    console.log("✅ Success with pg:", res.rows);
  } catch(e) {
    console.log("❌ Failed with pg:", e.message);
  } finally {
    await client.end();
  }
}
run();
