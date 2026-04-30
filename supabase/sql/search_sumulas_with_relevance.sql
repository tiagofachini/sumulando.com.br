-- ============================================================
-- search_sumulas_with_count — relevance ranking (v2, robust)
-- Run in: https://supabase.com/dashboard/project/rjitzozuzonlnvczuvcy/sql/new
-- ============================================================
-- Drops old function regardless of signature before recreating.
-- Uses text[] for array params (no UUID cast errors from URL strings).
--
-- Relevance scoring (ORDER BY score DESC, publish_date DESC):
--   80 → query is a whole word/number in the title  (\m...\M regex)
--   70 → query appears anywhere in the title
--   30 → query appears in the content
--   10 → query appears in an associated FAQ
--    0 → no query (returns all sorted by date)
-- ============================================================

-- Drop all known signatures so type changes are safe
DROP FUNCTION IF EXISTS search_sumulas_with_count(text, uuid[], uuid[], int, int);
DROP FUNCTION IF EXISTS search_sumulas_with_count(text, text[], text[], int, int);

CREATE FUNCTION search_sumulas_with_count(
  p_query     text   DEFAULT '',
  p_tribunais text[] DEFAULT NULL,
  p_topicos   text[] DEFAULT NULL,
  p_limit     int    DEFAULT 100,
  p_offset    int    DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result     json;
  safe_query text;
BEGIN
  -- Escape regex special chars so numbers/symbols work safely
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
        -- Word-boundary match in title (e.g. "636" isolated, not inside "6360")
        WHEN safe_query <> '' AND s.title ~* ('\m' || safe_query || '\M') THEN 80
        -- Substring match in title
        WHEN s.title ILIKE '%' || p_query || '%' THEN 70
        -- Match in content
        WHEN s.content ILIKE '%' || p_query || '%' THEN 30
        -- Match in a related FAQ
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
      -- Text filter: title, content or FAQ
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
      -- Tribunal filter: cast UUID to text for safe comparison with any string
      AND (p_tribunais IS NULL OR s.tribunal_id::text = ANY(p_tribunais))
      -- Topic filter
      AND (
        p_topicos IS NULL
        OR EXISTS (
          SELECT 1 FROM sumula_topicos st
          WHERE st.sumula_id = s.id
            AND st.topico_id::text = ANY(p_topicos)
        )
      )
  ),

  -- Aggregate topics in a subquery to avoid row duplication
  with_topics AS (
    SELECT
      r.*,
      COALESCE(
        (
          SELECT json_agg(json_build_object('id', tp.id, 'name', tp.name))
          FROM   sumula_topicos st
          JOIN   topicos tp ON tp.id = st.topico_id
          WHERE  st.sumula_id = r.id
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

GRANT EXECUTE ON FUNCTION search_sumulas_with_count(text, text[], text[], int, int)
  TO anon, authenticated;
