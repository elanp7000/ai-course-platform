import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local manually since we are running outside Next.js
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing Supabase Connection...');
console.log('URL:', supabaseUrl ? 'Found' : 'Missing');
console.log('Key:', supabaseAnonKey ? 'Found' : 'Missing');

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing environment variables!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
    try {
        const { data, error } = await supabase.from('test_connection').select('*').limit(1);
        // Even if the table doesn't exist, we might get a specific error (404 or 42P01)
        // which confirms we hit the server. Network error is what we are looking for.

        if (error) {
            console.log('Connection Response:', error.message);
            if (error.code) console.log('Error Code:', error.code);
        } else {
            console.log('Connection Successful!');
        }
    } catch (err) {
        console.error('Network/Unexpected Error:', err);
    }
}

testConnection();
