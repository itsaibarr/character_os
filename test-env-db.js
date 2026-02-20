import dotenv from 'dotenv';
import postgres from 'postgres';
dotenv.config({ path: '.env.local' });

console.log("URL:", process.env.DATABASE_URL.replace(/:(.*?)@/, ':***@'));

const sql = postgres(process.env.DATABASE_URL);
async function run() {
  try {
    const res = await sql`SELECT 1 as result`;
    console.log("Success:", res);
  } catch(e) {
    console.log("Error:", e.message, e.code);
  } finally {
    sql.end();
  }
}
run();
