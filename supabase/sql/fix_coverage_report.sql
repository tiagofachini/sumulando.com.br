-- ============================================================
-- Rewrite get_coverage_report for performance
-- Replaces NOT IN (generate_series) with EXCEPT — O(n) instead of O(n²)
-- Run in: https://supabase.com/dashboard/project/rjitzozuzonlnvczuvcy/sql/new
-- ============================================================

-- Index to speed up tribunal_numbers CTE scan
CREATE INDEX IF NOT EXISTS idx_sumulas_tribunal_id ON sumulas(tribunal_id);

-- Drop and recreate (signature unchanged — no type conflict)
CREATE OR REPLACE FUNCTION get_coverage_report()
RETURNS TABLE (
  tribunal_id          text,
  tribunal_name        text,
  official_url         text,
  sumula_url_template  text,
  expected_count       integer,
  sumulas_count        bigint,
  coverage_pct         numeric,
  missing_numbers      integer[]
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH tribunal_numbers AS (
    -- Extract leading number from each sumula title, per tribunal
    SELECT
      s.tribunal_id,
      (regexp_match(s.title, '(\d+)'))[1]::integer AS sumula_number
    FROM sumulas s
    WHERE (regexp_match(s.title, '(\d+)'))[1] IS NOT NULL
  ),
  coverage AS (
    SELECT
      t.id,
      t.name,
      t.official_url,
      t.sumula_url_template,
      t.expected_count,
      COUNT(DISTINCT tn.sumula_number)::bigint AS sumulas_count,
      -- EXCEPT is O(n+m) vs NOT IN O(n*m) — critical for 700+ expected sumulas
      ARRAY(
        SELECT gs
        FROM generate_series(1, COALESCE(t.expected_count, 0)) gs
        EXCEPT
        SELECT tn2.sumula_number
        FROM tribunal_numbers tn2
        WHERE tn2.tribunal_id = t.id
        ORDER BY 1
      ) AS missing_numbers
    FROM tribunais t
    LEFT JOIN tribunal_numbers tn ON tn.tribunal_id = t.id
    WHERE t.expected_count IS NOT NULL AND t.expected_count > 0
    GROUP BY t.id, t.name, t.official_url, t.sumula_url_template, t.expected_count
  )
  SELECT
    c.id::text,
    c.name,
    c.official_url,
    c.sumula_url_template,
    c.expected_count,
    c.sumulas_count,
    CASE WHEN c.expected_count > 0
      THEN ROUND((c.sumulas_count::numeric / c.expected_count) * 100, 1)
      ELSE 0::numeric
    END,
    c.missing_numbers
  FROM coverage c
  ORDER BY c.name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_coverage_report() TO anon, authenticated;
