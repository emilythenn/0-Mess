const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing environment variables! Please check backend/.env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const tables = ['profiles', 'groups', 'group_members', 'group_join_requests', 'tasks', 'commits', 'feedback', 'polls', 'events', 'files', 'document_chunks'];
  
  console.log("Checking Supabase tables connection...");
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.error(`Table '${table}' query failed:`, error.message);
      } else {
        console.log(`Table '${table}' is connected and accessible.`);
      }
    } catch (err) {
      console.error(`Unexpected error querying table '${table}':`, err);
    }
  }
}

checkTables();
