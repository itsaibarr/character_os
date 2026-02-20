const postgres = require('postgres');
const dns = require('dns').promises;

async function run() {
  const host = 'aws-0-us-east-1.pooler.supabase.com';
  const ips = await dns.resolve4(host);
  const ipv4 = ips[0];
  console.log("IPv4:", ipv4);

  const testCases = [
    { name: "Port 6543 (Transaction) URL string", url: `postgres://postgres.pakjnadgcyshcnzpbwhs:knATMWj0dryG9CP6@${ipv4}:6543/postgres?sslmode=require` },
    { name: "Port 5432 (Session) URL string", url: `postgres://postgres.pakjnadgcyshcnzpbwhs:knATMWj0dryG9CP6@${ipv4}:5432/postgres?sslmode=require` }
  ];

  for (const tc of testCases) {
    console.log(`\nTesting ${tc.name}...`);
    const sql = postgres(tc.url, { ssl: "require", connect_timeout: 10 });
    try {
      const res = await sql`SELECT 1 as result`;
      console.log("✅ Success", res);
    } catch(e) {
      console.log("❌ Failed:", e.message, e.code);
    } finally {
      await sql.end();
    }
  }
}
run();
