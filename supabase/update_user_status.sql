-- 1. Add status column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending';

-- 2. Update existing users to 'approved' (migration)
UPDATE public.users 
SET status = 'approved' 
WHERE status = 'pending'; 
-- Note: Ideally we only update existing ones. Since default is pending, 
-- any pre-existing rows that had null (if column added without default) would need update.
-- But adding with DEFAULT 'pending' makes new column 'pending' for all rows if not specified? 
-- Postgres adds the column and populates it with default.
-- So we must update ALL current rows to 'approved' immediately.

UPDATE public.users SET status = 'approved';

-- 3. Policy for instructors to update status
CREATE POLICY "Instructors can update user status" 
ON public.users 
FOR UPDATE 
USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'instructor')
);

-- 4. Policy for viewing users (Instructors need to see all users)
-- Existing policy: "Public profiles are viewable by everyone." (true)
-- So instructors can already see everyone.

-- 5. (Optional but good) Policy to restrict 'pending' users from seeing content?
-- Depending on requirements. For now, we control UI visibility.
-- Ideally RLS should also block access to 'weeks', 'materials' etc for pending users.

-- Example security tightening (can be applied later or now):
-- ALTER POLICY "Weeks are viewable by everyone." ON weeks USING (
--   EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND status = 'approved')
-- );
-- But for now, let's stick to the 'status' column addition and UI handling.
