-- ============================================================
-- Monitor de Cobertura de Súmulas
-- Run in: https://supabase.com/dashboard/project/rjitzozuzonlnvczuvcy/sql/new
-- ============================================================
-- Step 1: Add monitoring columns to tribunais
ALTER TABLE tribunais
  ADD COLUMN IF NOT EXISTS official_url        text,
  ADD COLUMN IF NOT EXISTS expected_count      integer,
  ADD COLUMN IF NOT EXISTS sumula_url_template text;

-- Step 2: Pre-populate known official URLs and expected counts
-- Update by name (ILIKE for robustness). Admin can adjust counts in Tribunal Manager.
UPDATE tribunais SET
  official_url        = 'https://portal.stf.jus.br/jurisprudencia/listarSumula.asp',
  expected_count      = 759,
  sumula_url_template = 'https://portal.stf.jus.br/sumulas/verSumula.asp?numero={n}'
WHERE name ILIKE '%supremo tribunal federal%' OR name ILIKE '%STF%';

UPDATE tribunais SET
  official_url        = 'https://www.stj.jus.br/sites/portalp/Paginas/Jurisprudencia/Sumulas.aspx',
  expected_count      = 661,
  sumula_url_template = 'https://processo.stj.jus.br/SCON/sumulas/toc.jsp?livre=@NUM+%3D+%27{n}%27'
WHERE name ILIKE '%superior tribunal de justiça%' OR name ILIKE '%STJ%';

UPDATE tribunais SET
  official_url        = 'https://www.tst.jus.br/web/guest/sumulas',
  expected_count      = 464,
  sumula_url_template = ''
WHERE name ILIKE '%tribunal superior do trabalho%' OR name ILIKE '%TST%';

UPDATE tribunais SET
  official_url        = 'https://www.tse.jus.br/jurisprudencia/sumulas',
  expected_count      = 70,
  sumula_url_template = ''
WHERE name ILIKE '%tribunal superior eleitoral%' OR name ILIKE '%TSE%';

UPDATE tribunais SET
  official_url        = 'https://www.stm.jus.br/jurisprudencia/sumulas-stm',
  expected_count      = 31,
  sumula_url_template = ''
WHERE name ILIKE '%superior tribunal militar%' OR name ILIKE '%STM%';

-- Step 3: Coverage report RPC
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
    SELECT
      s.tribunal_id,
      (regexp_match(s.title, '\d+'))[1]::integer AS sumula_number
    FROM sumulas s
    WHERE (regexp_match(s.title, '\d+'))[1] IS NOT NULL
  ),
  coverage AS (
    SELECT
      t.id,
      t.name,
      t.official_url,
      t.sumula_url_template,
      t.expected_count,
      COUNT(DISTINCT tn.sumula_number) AS sumulas_count,
      ARRAY(
        SELECT n
        FROM generate_series(1, COALESCE(t.expected_count, 0)) n
        WHERE n NOT IN (
          SELECT COALESCE(tn2.sumula_number, 0)
          FROM tribunal_numbers tn2
          WHERE tn2.tribunal_id = t.id
        )
        ORDER BY n
      ) AS missing_numbers
    FROM tribunais t
    LEFT JOIN tribunal_numbers tn ON tn.tribunal_id = t.id
    WHERE t.expected_count IS NOT NULL AND t.expected_count > 0
    GROUP BY t.id, t.name, t.official_url, t.sumula_url_template, t.expected_count
  )
  SELECT
    c.id,
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
