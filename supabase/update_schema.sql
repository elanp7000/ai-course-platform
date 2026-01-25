
-- Function to strictly set one week as current and uncheck others
create or replace function public.set_current_week(p_week_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Check permission
  if not exists (select 1 from public.users where id = auth.uid() and role = 'instructor') then
    raise exception 'Access denied';
  end if;

  -- Reset all
  update public.weeks set is_current = false;

  -- Set target
  update public.weeks set is_current = true where id = p_week_id;
end;
$$;
