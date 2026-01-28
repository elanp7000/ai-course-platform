-- Add link_url column if it doesn't exist
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'portfolio_topics' and column_name = 'link_url') then
        alter table public.portfolio_topics add column link_url text;
    end if;
end $$;
