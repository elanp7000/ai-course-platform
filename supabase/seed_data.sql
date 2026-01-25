-- 1. Insert Week 1
INSERT INTO public.weeks (week_number, title, description, is_published)
VALUES (
  1, 
  'NotebookLM과 AI 도구 활용법', 
  '이번 주에는 생성형 AI의 기본 원리를 이해하고, Google NotebookLM을 사용하여 나만의 지식 베이스를 구축하는 방법을 실습합니다.',
  true
) ON CONFLICT (week_number) DO NOTHING;

-- 2. Insert Materials for Week 1
-- We first get the Week ID dynamically to ensure consistency
DO $$
DECLARE
  w_id uuid;
BEGIN
  SELECT id INTO w_id FROM public.weeks WHERE week_number = 1;

  INSERT INTO public.materials (week_id, title, type, description, content_url)
  VALUES 
  (w_id, 'AI 도구 소개 및 설정', 'video', '주요 AI 도구들의 특징과 설치 방법을 알아봅니다.', '#'),
  (w_id, 'NotebookLM 시작하기', 'text', 'Google NotebookLM의 기본 가이드 문서입니다.', '#'),
  (w_id, '프롬프트 엔지니어링 기초', 'pdf', '효과적인 프롬프트 작성을 위한 필수 가이드.', '#');
END $$;
