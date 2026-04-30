-- Fix: allow anon to insert feedbacks (public submissions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'feedbacks' AND policyname = 'allow_anon_insert'
  ) THEN
    CREATE POLICY allow_anon_insert ON feedbacks
      FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

-- Fix: allow anon to update feedbacks (admin: status change, edit content)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'feedbacks' AND policyname = 'allow_anon_update'
  ) THEN
    CREATE POLICY allow_anon_update ON feedbacks
      FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Fix: allow anon to delete feedbacks (admin: remove records)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'feedbacks' AND policyname = 'allow_anon_delete'
  ) THEN
    CREATE POLICY allow_anon_delete ON feedbacks
      FOR DELETE TO anon USING (true);
  END IF;
END $$;

-- Fix: recreate search_feedbacks as SECURITY DEFINER so it bypasses RLS
-- when called by anon (admin panel uses anon key without Supabase Auth)
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
