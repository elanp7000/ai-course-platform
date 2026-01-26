-- 1. Create storage bucket for lecture materials
insert into storage.buckets (id, name, public)
values ('lecture_materials', 'lecture_materials', true)
on conflict (id) do nothing;

-- 2. Storage Policies
-- Allow public read access
create policy "Public Access Lecture Materials"
  on storage.objects for select
  using ( bucket_id = 'lecture_materials' );

-- Allow instructors to upload
create policy "Instructors Upload Lecture Materials"
  on storage.objects for insert
  with check ( 
    bucket_id = 'lecture_materials' 
    and exists (select 1 from public.users where id = auth.uid() and role = 'instructor')
  );

-- Allow instructors to update/delete
create policy "Instructors Manage Lecture Materials"
  on storage.objects for update
  using ( 
    bucket_id = 'lecture_materials' 
    and exists (select 1 from public.users where id = auth.uid() and role = 'instructor')
  );

create policy "Instructors Delete Lecture Materials"
  on storage.objects for delete
  using ( 
    bucket_id = 'lecture_materials' 
    and exists (select 1 from public.users where id = auth.uid() and role = 'instructor')
  );

-- 3. Update Materials Table Constraint to include 'image'
alter table public.materials drop constraint if exists materials_type_check;
alter table public.materials add constraint materials_type_check 
  check (type in ('pdf', 'link', 'video', 'text', 'image'));
