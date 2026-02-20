const postgres = require('postgres');

const url = "postgres://postgres.pakjnadgcyshcnzpbwhs:knATMWj0dryG9CP6@aws-0-us-east-1.pooler.supabase.com:5432/postgres";

async function run() {
  console.log("Test 1: ssl: require, default prepare");
  try {
    const sql = postgres(url, { ssl: "require", connect_timeout: 3 });
    await sql`SELECT 1`;
    console.log("✅ Success");
    sql.end();
  } catch(e) { console.log("❌ Failed:", e.message); }

  console.log("\nTest 2: ssl: require, prepare: false");
  try {
    const sql = postgres(url, { ssl: "require", prepare: false, connect_timeout: 3 });
    await sql`SELECT 1`;
    console.log("✅ Success");
    sql.end();
  } catch(e) { console.log("❌ Failed:", e.message); }

  console.log("\nTest 3: Port 6543, ssl: require, prepare: false");
  try {
    const url2 = "postgres://postgres.pakjnadgcyshcnzpbwhs:knATMWj0dryG9CP6@aws-0-us-east-1.pooler.supabase.com:6543/postgres";
    const sql = postgres(url2, { ssl: "require", prepare: false, connect_timeout: 3 });
    await sql`SELECT 1`;
    console.log("✅ Success");
    sql.end();
  } catch(e) { console.log("❌ Failed:", e.message); }
}
run();
