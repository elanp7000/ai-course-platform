-- Allow instructors to update any portfolio
-- This is required so they can move students' assignments to topics
create policy "Instructors can update any portfolio." on portfolios
  for update using (
    exists (select 1 from users where id = auth.uid() and role = 'instructor')
  );
