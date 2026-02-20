import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const url = "postgres://postgres.pakjnadgcyshcnzpbwhs:knATMWj0dryG9CP6@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require";

async function run() {
  const client = postgres(url, { ssl: "require" });
  const db = drizzle(client);
  
  try {
    const res = await db.execute('SELECT 1 as result');
    console.log("Success:", res);
  } catch(e) {
    console.log("Error directly:", e);
  } finally {
    await client.end();
  }
}
run();
