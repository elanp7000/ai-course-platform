-- Enable RLS
alter table public.materials enable row level security;

-- Allow everyone to read materials
create policy "Public can view materials"
on public.materials for select
using (true);

-- Allow instructors to insert, update, delete
create policy "Instructors can insert materials"
on public.materials for insert
with check (
  exists (select 1 from public.users where id = auth.uid() and role = 'instructor')
);

create policy "Instructors can update materials"
on public.materials for update
using (
  exists (select 1 from public.users where id = auth.uid() and role = 'instructor')
);

create policy "Instructors can delete materials"
on public.materials for delete
using (
  exists (select 1 from public.users where id = auth.uid() and role = 'instructor')
);
