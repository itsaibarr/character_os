import postgres from "postgres";

const ref = "pakjnadgcyshcnzpbwhs";
const pass = "knATMWj0dryG9CP6";
const region = "us-east-1"; // Just guessing based on previous pooler URL

const testCases = [
  // Pooler on port 6543 with prepare: false
  { url: `postgres://postgres.${ref}:${pass}@aws-0-${region}.pooler.supabase.com:6543/postgres?sslmode=require`, opts: { prepare: false } },
  // Pooler on port 5432
  { url: `postgres://postgres.${ref}:${pass}@aws-0-${region}.pooler.supabase.com:5432/postgres?sslmode=require`, opts: {} },
  // Pooler without sslmode in query but in options
  { url: `postgres://postgres.${ref}:${pass}@aws-0-${region}.pooler.supabase.com:6543/postgres`, opts: { prepare: false, ssl: 'prefer' } },
  { url: `postgres://postgres.${ref}:${pass}@aws-0-${region}.pooler.supabase.com:5432/postgres`, opts: { ssl: 'prefer' } },
];

async function run() {
  for (const {url, opts} of testCases) {
    console.log(`Testing: ${url.replace(pass, '***')}`);
    const sql = postgres(url, { ...opts, connect_timeout: 3 });
    try {
      await sql`SELECT 1 as result`;
      console.log('✅ Success\n');
    } catch (e) {
      console.log(`❌ Failed: ${e.message} (code: ${e.code})\n`);
    } finally {
      await sql.end();
    }
  }
}
run();
