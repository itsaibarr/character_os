import postgres from 'postgres';

const url = "postgres://postgres.pakjnadgcyshcnzpbwhs:knATMWj0dryG9CP6@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require";
const sql = postgres(url, { ssl: 'require', connect_timeout: 3 });

async function run() {
  try {
    const res = await sql`SELECT 1 as result`;
    console.log("Success:", res);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await sql.end();
  }
}

run();
