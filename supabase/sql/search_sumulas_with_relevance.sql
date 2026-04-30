-- ============================================================
-- search_sumulas_with_count — rewrite with relevance ranking
-- Run in: https://supabase.com/dashboard/project/rjitzozuzonlnvczuvcy/sql/new
-- ============================================================
--
-- Relevance scoring:
--   80 → query matches title as a whole word / number (word-boundary regex)
--   70 → query appears anywhere in title (substring)
--   30 → query appears in content
--   10 → query appears in an associated FAQ
--    0 → no query (returns all, ordered by publish_date)
--
-- Results are ordered: relevance_score DESC, publish_date DESC NULLS LAST
-- ============================================================

CREATE OR REPLACE FUNCTION search_sumulas_with_count(
  p_query     text    DEFAULT '',
  p_tribunais uuid[]  DEFAULT NULL,
  p_topicos   uuid[]  DEFAULT NULL,
  p_limit     int     DEFAULT 100,
  p_offset    int     DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result      json;
  safe_query  text;
BEGIN
  -- Escape special regex characters so numbers/symbols are safe
  safe_query := regexp_replace(p_query, '([.+*?()\[\]{}|^$\\])', '\\\1', 'g');

  WITH ranked AS (
    SELECT
      s.id,
      s.slug,
      s.title,
      s.content,
      s.tribunal_id,
      s.publish_date,
      s.reference_link,
      s.youtube_url,
      CASE
        WHEN p_query = '' THEN 0

        -- Word-boundary match in title (highest priority)
        -- \m = word start, \M = word end in PostgreSQL regex
        WHEN safe_query <> '' AND s.title ~* ('\m' || safe_query || '\M') THEN 80

        -- Substring match in title (second priority)
        WHEN s.title ILIKE '%' || p_query || '%' THEN 70

        -- Match in content (lower priority)
        WHEN s.content ILIKE '%' || p_query || '%' THEN 30

        -- Match in associated FAQs (lowest priority)
        WHEN EXISTS (
          SELECT 1 FROM faqs f
          WHERE f.sumula_id = s.id
            AND (
              f.question ILIKE '%' || p_query || '%'
              OR f.answer  ILIKE '%' || p_query || '%'
            )
        ) THEN 10

        ELSE 0
      END AS relevance_score
    FROM sumulas s
    WHERE
      -- Full-text filter: title, content, or any related FAQ
      (
        p_query = ''
        OR s.title   ILIKE '%' || p_query || '%'
        OR s.content ILIKE '%' || p_query || '%'
        OR EXISTS (
          SELECT 1 FROM faqs f
          WHERE f.sumula_id = s.id
            AND (
              f.question ILIKE '%' || p_query || '%'
              OR f.answer  ILIKE '%' || p_query || '%'
            )
        )
      )
      -- Tribunal filter
      AND (p_tribunais IS NULL OR s.tribunal_id = ANY(p_tribunais))
      -- Topic filter
      AND (
        p_topicos IS NULL
        OR EXISTS (
          SELECT 1 FROM sumula_topicos st
          WHERE st.sumula_id = s.id AND st.topico_id = ANY(p_topicos)
        )
      )
  ),

  -- Aggregate topics separately to avoid duplicating rows
  with_topics AS (
    SELECT
      r.*,
      COALESCE(
        (
          SELECT json_agg(json_build_object('id', tp.id, 'name', tp.name))
          FROM sumula_topicos st
          JOIN topicos tp ON tp.id = st.topico_id
          WHERE st.sumula_id = r.id
        ),
        '[]'::json
      ) AS topics
    FROM ranked r
  )

  SELECT json_build_object(
    'total_count',  (SELECT COUNT(*) FROM ranked),
    'sumulas_data', COALESCE(
      (
        SELECT json_agg(row_to_json(wt.*))
        FROM (
          SELECT *
          FROM   with_topics
          ORDER  BY relevance_score DESC, publish_date DESC NULLS LAST
          LIMIT  p_limit
          OFFSET p_offset
        ) wt
      ),
      '[]'::json
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION search_sumulas_with_count(text, uuid[], uuid[], int, int)
  TO anon, authenticated;
