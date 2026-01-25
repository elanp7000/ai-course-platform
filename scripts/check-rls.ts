
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRLS() {
    console.log("--- Login ---");
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
        email: 'aiswit100@gmail.com',
        password: 'password123'
    });

    if (authError || !user) {
        console.error("Login failed:", authError);
        return;
    }
    console.log("Logged in as:", user.email, "ID:", user.id);

    // 1. Check User Role in 'public.users'
    console.log("\n--- Checking Role ---");
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    console.log("User Role in DB:", profile?.role);

    // 2. Attempt Direct Update (Bypassing RPC)
    console.log("\n--- Attempting Direct Update (Week 3 Title) ---");
    const { data: week3 } = await supabase.from('weeks').select('id, title').eq('week_number', 3).single();
    if (!week3) {
        console.error("Week 3 not found");
        return;
    }
    console.log("Current Week 3 Title:", week3.title);

    const { error: updateError } = await supabase
        .from('weeks')
        .update({ title: week3.title + " [TEST]" })
        .eq('id', week3.id);

    if (updateError) {
        console.error("Direct Update Failed:", updateError);
    } else {
        console.log("Direct Update Success. Verifying...");
        const { data: verified } = await supabase.from('weeks').select('title').eq('id', week3.id).single();
        console.log("New Title:", verified?.title);

        // Revert
        await supabase.from('weeks').update({ title: week3.title }).eq('id', week3.id);
    }
}

checkRLS();
