
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyRpc() {
    // 1. Check initial state
    console.log("--- Initial State ---");
    const { data: initialWeeks } = await supabase
        .from('weeks')
        .select('week_number, is_current')
        .order('week_number')
        .limit(5);
    console.table(initialWeeks);

    // 2. Try to set Week 3 as current via RPC
    console.log("\n--- Calling RPC for Week 3 ---");

    // First get Week 3 ID
    const { data: week3 } = await supabase.from('weeks').select('id').eq('week_number', 3).single();

    if (!week3) {
        console.error("Week 3 not found!");
        return;
    }

    // Login omitted for debugging as auth check was removed from RPC
    // await supabase.auth.signInWithPassword({
    //     email: 'aiswit100@gmail.com',
    //     password: 'password123'
    // });

    const { error } = await supabase.rpc('set_current_week', { p_week_id: week3.id });

    if (error) {
        console.error("RPC Error:", error);
    } else {
        console.log("RPC Success");
    }

    // 3. Check Persistence
    console.log("\n--- Final State ---");
    const { data: finalWeeks } = await supabase
        .from('weeks')
        .select('week_number, is_current')
        .order('week_number')
        .limit(5);
    console.table(finalWeeks);
}

verifyRpc();
