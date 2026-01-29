-- 1. Insert 'Common' week (Week 0)
INSERT INTO public.weeks (week_number, title, description, is_published)
VALUES (0, '공통', '공통 학습 자료입니다.', true)
ON CONFLICT (week_number) DO UPDATE 
SET title = '공통';

-- 2. Ensure RLS policies on materials are correct (already done in previous step, but double check not needed here)
