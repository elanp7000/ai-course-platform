-- Create notices table
create table if not exists public.notices (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  created_at timestamp with time zone default now() not null,
  author_id uuid references auth.users(id)
);

-- Enable RLS
alter table public.notices enable row level security;

-- Policy: Everyone can read notices
create policy "Everyone can read notices"
  on public.notices for select
  using ( true );

-- Policy: Instructors can insert notices
create policy "Instructors can insert notices"
  on public.notices for insert
  with check (
    auth.jwt() ->> 'email' = 'aiswit100@gmail.com'
    OR
    exists (select 1 from public.users where id = auth.uid() and role = 'instructor')
  );

-- Policy: Instructors can update notices
create policy "Instructors can update notices"
  on public.notices for update
  using (
    auth.jwt() ->> 'email' = 'aiswit100@gmail.com'
    OR
    exists (select 1 from public.users where id = auth.uid() and role = 'instructor')
  );

-- Policy: Instructors can delete notices
create policy "Instructors can delete notices"
  on public.notices for delete
  using (
    auth.jwt() ->> 'email' = 'aiswit100@gmail.com'
    OR
    exists (select 1 from public.users where id = auth.uid() and role = 'instructor')
  );
