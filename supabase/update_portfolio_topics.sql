-- Create portfolio_topics table
create table public.portfolio_topics (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add topic_id to portfolios
alter table public.portfolios 
add column topic_id uuid references public.portfolio_topics(id) on delete set null;

-- Enable RLS
alter table public.portfolio_topics enable row level security;

-- Policies for portfolio_topics
-- Everyone can view topics
create policy "Topics are viewable by everyone." on portfolio_topics
  for select using (true);

-- Only instructors can insert/update/delete topics
create policy "Only instructors can manage topics." on portfolio_topics
  for all using (
    exists (select 1 from users where id = auth.uid() and role = 'instructor')
  );
