-- 1. Add is_visible column to notices
alter table public.notices 
add column if not exists is_visible boolean default true;

-- 2. Add is_visible column to materials
alter table public.materials 
add column if not exists is_visible boolean default true;

-- 3. Update RLS for Notices
-- Drop existing select policy
drop policy if exists "Everyone can read notices" on public.notices;

-- Create new select policy: 
-- Instructors see all, 'aiswit100@gmail.com' sees all, others see only visible
create policy "Everyone can read visible notices"
  on public.notices for select
  using (
    is_visible = true
    OR
    auth.jwt() ->> 'email' = 'aiswit100@gmail.com'
    OR
    exists (select 1 from public.users where id = auth.uid() and role = 'instructor')
  );

-- 4. Update RLS for Materials
-- Drop existing select policy
drop policy if exists "Materials are viewable by everyone." on public.materials;

-- Create new select policy
create policy "Materials are viewable by everyone if visible."
  on public.materials for select
  using (
    is_visible = true
    OR
    exists (select 1 from public.users where id = auth.uid() and role = 'instructor')
  );
