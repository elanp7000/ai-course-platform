-- Add author_name column to portfolios table
alter table public.portfolios 
add column if not exists author_name text;

-- Optional: Update existing records to have a default name (e.g. 'Unknown' or fetch from users if possible, but simple update is safer)
-- We won't do a complex update here to avoid errors, new posts will have names.
