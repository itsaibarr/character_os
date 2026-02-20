import postgres from 'postgres';
import dns from 'dns/promises';

async function test() {
  try {
    const host = 'aws-0-us-east-1.pooler.supabase.com';
    const ips = await dns.resolve4(host);
    console.log(`Resolved ${host} to IPv4: ${ips[0]}`);
    
    // Test Port 5432 on pooler
    const sql = postgres({
      host: ips[0],
      port: 5432,
      database: 'postgres',
      username: 'postgres.pakjnadgcyshcnzpbwhs',
      password: 'knATMWj0dryG9CP6',
      ssl: 'require',
      connect_timeout: 3,
    });
    
    console.log('Connecting to pooler on port 5432...');
    const res = await sql`SELECT 1 as result`;
    console.log('✅ Success on Port 5432:', res);
    await sql.end();
  } catch (err) {
    console.error('❌ Failed:', err.message);
  }
}
test();
