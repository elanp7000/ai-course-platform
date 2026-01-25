
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUser() {
    console.log("--- Logging In ---");
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
        email: 'aiswit100@gmail.com',
        password: 'password123'
    });

    if (authError || !user) {
        console.error("Login failed:", authError);
        return;
    }

    console.log("Auth User ID:", user.id);
    console.log("Auth Email:", user.email);

    console.log("\n--- Checking Public Profile ---");
    const { data: profile, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

    if (dbError) {
        console.error("Fetch profile error:", dbError);
    } else {
        console.table(profile);
    }
}

checkUser();
