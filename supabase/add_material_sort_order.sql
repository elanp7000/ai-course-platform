-- Add sort_order column to materials table
alter table public.materials 
add column if not exists sort_order integer default 0;

-- Optional: Initialize sort_order based on creation date for existing items
-- This ensures existing items have a stable initial order
with ranked_materials as (
  select id, row_number() over (partition by week_id order by created_at asc) as rn
  from public.materials
)
update public.materials
set sort_order = ranked_materials.rn
from ranked_materials
where public.materials.id = ranked_materials.id;
