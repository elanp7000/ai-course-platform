-- Add author_name column to discussions table
alter table public.discussions 
add column if not exists author_name text;
