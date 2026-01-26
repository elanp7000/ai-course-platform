-- 1. Create storage bucket for notice images
insert into storage.buckets (id, name, public)
values ('notice_images', 'notice_images', true)
on conflict (id) do nothing;

-- 2. Storage Policies
-- Allow public read access
create policy "Public Access Notice Images"
  on storage.objects for select
  using ( bucket_id = 'notice_images' );

-- Allow instructors to upload
create policy "Instructors Upload Notice Images"
  on storage.objects for insert
  with check ( 
    bucket_id = 'notice_images' 
    and exists (select 1 from public.users where id = auth.uid() and role = 'instructor')
  );

-- Allow instructors to update/delete
create policy "Instructors Manage Notice Images"
  on storage.objects for update
  using ( 
    bucket_id = 'notice_images' 
    and exists (select 1 from public.users where id = auth.uid() and role = 'instructor')
  );

create policy "Instructors Delete Notice Images"
  on storage.objects for delete
  using ( 
    bucket_id = 'notice_images' 
    and exists (select 1 from public.users where id = auth.uid() and role = 'instructor')
  );

-- 3. Add images column to notices table
alter table public.notices 
add column if not exists images text[] default '{}';
