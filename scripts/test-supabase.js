const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            process.env[key] = value;
        }
    });
} catch (e) {
    console.log('Could not read .env.local');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing Supabase Connection...');
console.log('URL:', supabaseUrl ? 'Found' : 'Missing');
console.log('Key:', supabaseAnonKey ? 'Found' : 'Missing');

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing environment variables!');
    if (!supabaseUrl) console.error('NEXT_PUBLIC_SUPABASE_URL is missing');
    if (!supabaseAnonKey) console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY is missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
    try {
        const { data, error } = await supabase.from('test_connection').select('*').limit(1);

        if (error) {
            console.log('Connection Response:', error.message);
            if (error.code) console.log('Error Code:', error.code);

            // PGRST204 means table not found, which implies connection IS working.
            if (error.code === '42P01' || error.code === 'PGRST204') {
                console.log('Connection successful! (Table not found, but we reached the DB)');
            }
        } else {
            console.log('Connection Successful!');
        }
    } catch (err) {
        console.error('Network/Unexpected Error:', err);
    }
}

testConnection();
