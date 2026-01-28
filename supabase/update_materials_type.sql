-- Remove existing check constraint if it strictly enforces types
-- Note: Supabase/Postgres constraints are named. We need to drop the specific constraint.
-- Assuming the constraint is on the 'type' column.
-- Let's try to drop the constraint 'materials_type_check' if it exists and add a new one.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'materials_type_check'
    ) THEN
        ALTER TABLE public.materials DROP CONSTRAINT materials_type_check;
    END IF;
END $$;

-- Add updated constraint including 'ai_tool'
-- Types from code: 'video', 'text', 'pdf', 'link', 'image', 'html', and now 'ai_tool'
-- Note: 'text' was in the code but might not be in the constraint. Let's include all known types.
ALTER TABLE public.materials 
ADD CONSTRAINT materials_type_check 
CHECK (type IN ('video', 'text', 'pdf', 'link', 'image', 'html', 'ai_tool'));
