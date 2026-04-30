-- ============================================================
-- Feedbacks: complete RLS + function fix
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Ensure RLS is enabled
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- 2. Drop any old policies cleanly before recreating
DROP POLICY IF EXISTS allow_anon_select   ON feedbacks;
DROP POLICY IF EXISTS allow_anon_insert   ON feedbacks;
DROP POLICY IF EXISTS allow_anon_update   ON feedbacks;
DROP POLICY IF EXISTS allow_anon_delete   ON feedbacks;

-- 3. SELECT — required for PostgREST UPDATE/DELETE to find rows
CREATE POLICY allow_anon_select ON feedbacks
  FOR SELECT TO anon USING (true);

-- 4. INSERT — public feedback submissions
CREATE POLICY allow_anon_insert ON feedbacks
  FOR INSERT TO anon WITH CHECK (true);

-- 5. UPDATE — admin status change / edit
CREATE POLICY allow_anon_update ON feedbacks
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 6. DELETE — admin remove record
CREATE POLICY allow_anon_delete ON feedbacks
  FOR DELETE TO anon USING (true);

-- 7. search_feedbacks — SECURITY DEFINER so RLS is bypassed inside the function
CREATE OR REPLACE FUNCTION search_feedbacks(
  p_search_term text DEFAULT '',
  p_status      text DEFAULT 'all'
)
RETURNS TABLE(
  id           uuid,
  content      text,
  status       text,
  created_at   timestamptz,
  sumula_id    uuid,
  sumula_title text,
  sumula_slug  text,
  faq_id       uuid,
  faq_question text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.content,
    f.status,
    f.created_at,
    f.sumula_id,
    s.title    AS sumula_title,
    s.slug     AS sumula_slug,
    f.faq_id,
    fa.question AS faq_question
  FROM feedbacks f
  LEFT JOIN sumulas s  ON s.id  = f.sumula_id
  LEFT JOIN faqs   fa ON fa.id = f.faq_id
  WHERE
    (p_status = 'all' OR f.status = p_status)
    AND (
      p_search_term = ''
      OR f.content      ILIKE '%' || p_search_term || '%'
      OR s.title        ILIKE '%' || p_search_term || '%'
      OR fa.question    ILIKE '%' || p_search_term || '%'
    )
  ORDER BY f.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION search_feedbacks(text, text) TO anon, authenticated;

-- 8. get_feedback_stats — used by the admin dashboard counts
DROP FUNCTION IF EXISTS get_feedback_stats();
CREATE OR REPLACE FUNCTION get_feedback_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'novo',      COUNT(*) FILTER (WHERE status = 'novo'),
    'lido',      COUNT(*) FILTER (WHERE status = 'lido'),
    'resolvido', COUNT(*) FILTER (WHERE status = 'resolvido')
  ) INTO result
  FROM feedbacks;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_feedback_stats() TO anon, authenticated;
