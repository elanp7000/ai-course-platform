-- Create comments table
create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) not null,
  content text not null,
  created_at timestamptz default now(),
  discussion_id uuid references public.discussions(id) on delete cascade,
  portfolio_id uuid references public.portfolios(id) on delete cascade,
  author_name text,
  
  -- Ensure comment belongs to either discussion or portfolio, not both (or neither)
  constraint comment_target_check check (
    (discussion_id is not null and portfolio_id is null) or
    (discussion_id is null and portfolio_id is not null)
  )
);

-- Enable RLS
alter table public.comments enable row level security;

-- Policies

-- 1. View: Everyone can view comments
create policy "Comments are viewable by everyone"
  on public.comments for select
  using (true);

-- 2. Insert: Authenticated users can comment
create policy "Users can insert their own comments"
  on public.comments for insert
  with check (auth.uid() = user_id);

-- 3. Delete: Owners can delete their own comments
create policy "Users can delete their own comments"
  on public.comments for delete
  using (auth.uid() = user_id);

-- 4. Delete: Instructors can delete ANY comment
create policy "Instructors can delete any comment"
  on public.comments for delete
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'instructor')
  );
