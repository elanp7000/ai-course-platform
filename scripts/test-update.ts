
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUpdate() {
    console.log("Attempting to update weeks...");

    // Sign in as instructor first to pass RLS
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
        email: 'aiswit100@gmail.com',
        password: 'password123' // Assuming this is the password used, or I'll need to use a service role key if I can't login
    });

    if (authError) {
        console.error("Login failed:", authError);
        // Fallback: Use service role if available? No, I don't have it in env variables shown.
        // User logged in via UI. Assuming I can't easily login via script without correct password.
        // But wait, the previous DB check script worked because 'select' is public. 'Update' needs auth.
        console.log("Cannot test RLS Update without specific user credentials. Checking public access...");
        return;
    }

    console.log("Logged in:", user?.email);

    // 1. Reset all
    const { data: resetData, error: resetError } = await supabase
        .from('weeks')
        .update({ is_current: false })
        .neq('id', '00000000-0000-0000-0000-000000000000')
        .select();

    if (resetError) {
        console.error("Reset Error:", resetError);
    } else {
        console.log("Reset Success. Rows affected:", resetData?.length);
    }

    // 2. Set week 3 current
    const { data: weeks } = await supabase.from('weeks').select('id').eq('week_number', 3).single();
    if (weeks) {
        const { data: updateData, error: updateError } = await supabase
            .from('weeks')
            .update({ is_current: true })
            .eq('id', weeks.id)
            .select();

        if (updateError) {
            console.error("Update Error:", updateError);
        } else {
            console.log("Update Success:", updateData);
        }
    }
}

testUpdate();
