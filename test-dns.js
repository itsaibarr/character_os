const dns = require('dns');
dns.resolve4('aws-0-us-east-1.pooler.supabase.com', (err, addresses) => {
  console.log('Pooler IPv4:', err ? err.message : addresses);
});
dns.resolve6('aws-0-us-east-1.pooler.supabase.com', (err, addresses) => {
  console.log('Pooler IPv6:', err ? err.message : addresses);
});
dns.resolve4('db.pakjnadgcyshcnzpbwhs.supabase.co', (err, addresses) => {
  console.log('Direct IPv4:', err ? err.message : addresses);
});
dns.resolve6('db.pakjnadgcyshcnzpbwhs.supabase.co', (err, addresses) => {
  console.log('Direct IPv6:', err ? err.message : addresses);
});
