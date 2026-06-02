const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing environment variables! Please check backend/.env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyOrCreateDemoUsers() {
  const users = [
    { email: 'demo@0mess.com', password: 'demoPassword123', name: 'Demo Student' },
    { email: 'test@0mess.com', password: 'demoPassword123', name: 'Test Student' }
  ];

  console.log("Seeding demo accounts in Supabase Auth...");
  for (const user of users) {
    try {
      // Look up user by email in profiles
      const { data: profile, error: profileFetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      if (profileFetchError) {
        console.error(`Error looking up profile for ${user.email}:`, profileFetchError.message);
        continue;
      }

      if (profile && profile.id) {
        console.log(`User ${user.email} (UID: ${profile.id}) exists in profiles. Updating password and metadata...`);
        const { error: updateError } = await supabase.auth.admin.updateUserById(profile.id, {
          password: user.password,
          user_metadata: { name: user.name }
        });
        if (updateError) {
          console.error(`Failed to update auth password for ${user.email}:`, updateError.message);
        } else {
          console.log(`Updated auth password for ${user.email} to '${user.password}'.`);
          
          // Also update name/email in profiles table just in case
          const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update({
              name: user.name,
              avatar: user.name.split(' ').map(n => n[0]).join('').toUpperCase(),
              color: user.email.startsWith('demo') ? 'bg-indigo-600' : 'bg-emerald-600'
            })
            .eq('id', profile.id);

          if (profileUpdateError) {
            console.error(`Failed to update profile table for ${user.email}:`, profileUpdateError.message);
          } else {
            console.log(`Profile table updated for ${user.email}.`);
          }
        }
      } else {
        console.log(`User ${user.email} not found. Creating new user...`);
        const { data: createData, error: createError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: { name: user.name }
        });

        if (createError) {
          console.error(`Failed to create user ${user.email}:`, createError.message);
        } else if (createData && createData.user) {
          console.log(`Successfully created demo user: ${user.email} (UID: ${createData.user.id})`);
          
          // Upsert profile
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: createData.user.id,
              name: user.name,
              role: 'Project Member',
              email: user.email,
              avatar: user.name.split(' ').map(n => n[0]).join('').toUpperCase(),
              color: user.email.startsWith('demo') ? 'bg-indigo-600' : 'bg-emerald-600'
            });
            
          if (profileError) {
            console.error(`Error creating profile for ${user.email}:`, profileError.message);
          } else {
            console.log(`Profile created for ${user.email} in 'profiles' table.`);
          }
        }
      }
    } catch (err) {
      console.error(`Unexpected error for user ${user.email}:`, err);
    }
  }
}

verifyOrCreateDemoUsers();
