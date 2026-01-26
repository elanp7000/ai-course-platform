-- 1. Discussions Table (Shared Q&A)
create table if not exists public.discussions (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  created_at timestamp with time zone default now() not null,
  author_id uuid references auth.users(id),
  author_email text -- Optional: Store email for display
);

alter table public.discussions enable row level security;

-- RLS: Anyone can READ discussions
create policy "Everyone can read discussions"
  on public.discussions for select
  using ( true );

-- RLS: Authenticated users can INSERT discussions
create policy "Authenticated can insert discussions"
  on public.discussions for insert
  with check ( auth.role() = 'authenticated' );

-- RLS: Users can UPDATE OWN discussions OR Instructors
create policy "Users update own discussions"
  on public.discussions for update
  using ( 
    auth.uid() = author_id 
    OR 
    exists (select 1 from public.users where id = auth.uid() and role = 'instructor')
    OR
    auth.jwt() ->> 'email' = 'aiswit100@gmail.com'
  );

-- RLS: Users can DELETE OWN discussions OR Instructors
create policy "Users delete own discussions"
  on public.discussions for delete
  using ( 
    auth.uid() = author_id 
    OR 
    exists (select 1 from public.users where id = auth.uid() and role = 'instructor')
    OR
    auth.jwt() ->> 'email' = 'aiswit100@gmail.com'
  );


-- 2. Portfolios Table (Personal Works)
create table if not exists public.portfolios (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  project_url text, -- Link to project
  created_at timestamp with time zone default now() not null,
  user_id uuid references auth.users(id)
);

alter table public.portfolios enable row level security;

-- RLS: Everyone can READ portfolios (Peer review)
create policy "Everyone can read portfolios"
  on public.portfolios for select
  using ( true );

-- RLS: Users can INSERT their own portfolio
create policy "Users insert own portfolio"
  on public.portfolios for insert
  with check ( auth.uid() = user_id );

-- RLS: Users can UPDATE/DELETE their own portfolio
create policy "Users manage own portfolio"
  on public.portfolios for all
  using ( auth.uid() = user_id );
