-- ============================================================
-- Adiciona status às súmulas e normaliza títulos em massa
-- Run in: https://supabase.com/dashboard/project/rjitzozuzonlnvczuvcy/sql/new
-- ============================================================

-- 1. Adiciona coluna status (idempotente)
ALTER TABLE sumulas ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativa';

DO $$
BEGIN
  ALTER TABLE sumulas
    ADD CONSTRAINT chk_sumula_status CHECK (status IN ('ativa', 'cancelada'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Aplica status=cancelada onde o título contiver CANCELAD*
UPDATE sumulas
SET status = 'cancelada'
WHERE upper(title) LIKE '%CANCELAD%'
  AND status = 'ativa';

-- 3. Normaliza títulos: "Súmula [Vinculante] {número} do {TRIBUNAL}"
--    Mantém slugs intactos (URLs já indexadas no Google).
UPDATE sumulas s
SET title = CASE
  WHEN upper(s.title) LIKE '%VINCULANTE%'
    THEN 'Súmula Vinculante ' || (regexp_match(s.title, '\d+'))[1] || ' do ' || t.name
  ELSE
    'Súmula ' || (regexp_match(s.title, '\d+'))[1] || ' do ' || t.name
END
FROM tribunais t
WHERE s.tribunal_id = t.id
  AND (regexp_match(s.title, '\d+'))[1] IS NOT NULL;

-- 4. Recria get_sumula_details incluindo o campo status
--    (DROP obrigatório pois o tipo de retorno muda)
DROP FUNCTION IF EXISTS get_sumula_details(text) CASCADE;

CREATE OR REPLACE FUNCTION get_sumula_details(p_slug text)
RETURNS TABLE (
  id              uuid,
  slug            text,
  title           text,
  content         text,
  publish_date    date,
  reference_link  text,
  youtube_url     text,
  status          text,
  tribunal_name   text,
  topicos         json,
  faqs            json,
  related_sumulas json
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.slug,
    s.title,
    s.content,
    s.publish_date,
    s.reference_link,
    s.youtube_url,
    s.status,
    t.name AS tribunal_name,

    -- Tópicos da súmula
    COALESCE(
      (SELECT json_agg(json_build_object('id', tp.id, 'name', tp.name) ORDER BY tp.name)
       FROM sumula_topicos st
       JOIN topicos tp ON tp.id = st.topico_id
       WHERE st.sumula_id = s.id),
      '[]'::json
    ),

    -- FAQs
    COALESCE(
      (SELECT json_agg(json_build_object('id', f.id, 'question', f.question, 'answer', f.answer)
               ORDER BY f.created_at)
       FROM faqs f
       WHERE f.sumula_id = s.id),
      '[]'::json
    ),

    -- Súmulas relacionadas (até 5, com tópicos em comum)
    COALESCE(
      (SELECT json_agg(json_build_object(
        'id',            rs.id,
        'slug',          rs.slug,
        'title',         rs.title,
        'content',       rs.content,
        'tribunal_name', rt.name,
        'common_topics', (
          SELECT json_agg(json_build_object('id', tp.id, 'name', tp.name))
          FROM sumula_topicos sa
          JOIN sumula_topicos sb ON sb.topico_id = sa.topico_id AND sb.sumula_id = rs.id
          JOIN topicos tp ON tp.id = sa.topico_id
          WHERE sa.sumula_id = s.id
        )
      ))
      FROM (
        SELECT DISTINCT rs2.id, rs2.slug, rs2.title, rs2.content, rs2.tribunal_id
        FROM sumulas rs2
        JOIN sumula_topicos sa ON sa.sumula_id = s.id
        JOIN sumula_topicos sb ON sb.topico_id = sa.topico_id AND sb.sumula_id = rs2.id
        WHERE rs2.id != s.id
        LIMIT 5
      ) rs
      JOIN tribunais rt ON rt.id = rs.tribunal_id),
      '[]'::json
    )

  FROM sumulas s
  JOIN tribunais t ON t.id = s.tribunal_id
  WHERE s.slug = p_slug;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sumula_details(text) TO anon, authenticated;
