-- Add 'html' to the allowed types in materials table
alter table public.materials drop constraint if exists materials_type_check;

alter table public.materials add constraint materials_type_check 
  check (type in ('pdf', 'link', 'video', 'text', 'image', 'html'));
