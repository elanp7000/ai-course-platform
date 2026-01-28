-- Add sort_order column if it doesn't exist
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'portfolio_topics' and column_name = 'sort_order') then
        alter table public.portfolio_topics add column sort_order integer default 0;
    end if;
end $$;

-- Initialize sort_order for existing records based on creation time
with numbered as (
  select id, row_number() over (order by created_at) as rn
  from public.portfolio_topics
)
update public.portfolio_topics
set sort_order = numbered.rn
from numbered
where public.portfolio_topics.id = numbered.id;
