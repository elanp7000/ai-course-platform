-- 사용자에게 강사 권한을 부여하는 스크립트입니다.
-- 사용법: 아래의 'target_email@example.com'을 강사 권한을 부여할 사용자의 이메일로 변경하고 실행하세요.

DO $$
DECLARE
  target_email TEXT := 'target_email@example.com'; -- 여기에 이메일을 입력하세요
BEGIN
  -- 사용자가 존재하는지 확인
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = target_email) THEN
    -- public.users 테이블 업데이트
    UPDATE public.users
    SET role = 'instructor'
    WHERE email = target_email;
    
    RAISE NOTICE '성공: % 사용자에게 강사 권한이 부여되었습니다.', target_email;
  ELSE
    RAISE NOTICE '오류: % 이메일을 가진 사용자를 찾을 수 없습니다.', target_email;
  END IF;
END $$;
