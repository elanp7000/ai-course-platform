
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkWeeks() {
    const { data, error } = await supabase
        .from('weeks')
        .select('id, week_number, title, is_current')
        .order('week_number', { ascending: true });

    if (error) {
        console.error('Error fetching weeks:', error);
    } else {
        console.table(data);
    }
}

checkWeeks();
