import postgres from 'postgres';

const url = "postgres://postgres.pakjnadgcyshcnzpbwhs:knATMWj0dryG9CP6@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require";
const sql = postgres(url, { connect_timeout: 3 });

async function run() {
  try {
    console.log("Testing with URL string parsing...");
    const res = await sql`SELECT 1 as result`;
    console.log("✅ Success", res);
  } catch (e) {
    console.log("❌ Failed:", e.message, "Code:", e.code);
  } finally {
    await sql.end();
  }
}

run();
