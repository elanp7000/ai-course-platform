-- 1. Create a secure function to check instructor role
-- detailed: using 'security definer' allows this function to bypass RLS on the users table
create or replace function public.is_instructor()
returns boolean as $$
begin
  return exists (
    select 1
    from public.users
    where id = auth.uid()
    and role = 'instructor'
  );
end;
$$ language plpgsql security definer;

-- 2. Drop the simple policy if it exists (to avoid conflicts)
drop policy if exists "Instructors can update any portfolio." on portfolios;

-- 3. Create the robust policy using the secure function
create policy "Instructors can update any portfolio"
on portfolios
for update
using ( public.is_instructor() );

-- 4. (Optional) Ensure instructors can verify they are instructors
-- If the users table has RLS, this ensures they can read their own role (usually standard, but good to be safe)
create policy "Users can read own profile"
on users
for select
using ( auth.uid() = id );
