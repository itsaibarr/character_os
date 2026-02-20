import postgres from "postgres";

const PASS = "knATMWj0dryG9CP6";
const REF = "pakjnadgcyshcnzpbwhs";

async function test(name: string, url: string) {
  console.log(`\n--- Testing ${name} ---`);
  console.log(`URL: ${url.split('@')[1]}`); // Log only host for security
  
  const sql = postgres(url, { 
    prepare: false, 
    connect_timeout: 5,
    ssl: "require"
  });

  try {
    const result = await sql`SELECT 1 as result`.timeout(5000);
    console.log(`✅ ${name} Success!`);
  } catch (err: any) {
    console.error(`❌ ${name} Failed!`);
    console.error(`Message: ${err.message}`);
    console.error(`Code: ${err.code}`);
  } finally {
    await sql.end();
  }
}

async function run() {
  // 1. Direct connection (Session mode)
  await test("Direct (5432)", `postgres://postgres:${PASS}@db.${REF}.supabase.co:5432/postgres`);
  
  // 2. Pooled connection (Transaction mode)
  await test("Pooled (6543)", `postgres://postgres.${REF}:${PASS}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`);
}

run();
