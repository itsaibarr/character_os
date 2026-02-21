import { createClient } from '@supabase/supabase-js';
import { ITEM_CATALOG } from '../src/lib/gamification/item-catalog';
import * as fs from 'fs';
import * as path from 'path';

// Helper to load env vars from .env.local
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#\s]+)=(.+)$/);
      if (match) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
      }
    });
  }
}

async function seed() {
  loadEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`Seeding ${ITEM_CATALOG.length} items...`);

  const { data, error } = await supabase
    .from('items')
    .upsert(
      ITEM_CATALOG.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        rarity: item.rarity,
        effect_type: item.effectType,
        effect_value: item.effectValue,
        consumable: item.consumable,
      })),
      { onConflict: 'id' }
    );

  if (error) {
    console.error('Error seeding items:', error);
    process.exit(1);
  }

  console.log('Successfully seeded items catalog.');
}

seed().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
