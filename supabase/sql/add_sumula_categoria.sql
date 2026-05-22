-- ============================================================
-- Adiciona campo "categoria" às súmulas (vinculante / nao-vinculante)
-- Run in: https://supabase.com/dashboard/project/rjitzozuzonlnvczuvcy/sql/new
-- IMPORTANTE: se der erro de tipo de retorno, rode primeiro como query separada:
--   DROP FUNCTION IF EXISTS get_sumula_details(text) CASCADE;
-- ============================================================

-- 1. Adiciona coluna (idempotente)
ALTER TABLE sumulas ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'nao-vinculante';

DO $$
BEGIN
  ALTER TABLE sumulas
    ADD CONSTRAINT chk_sumula_categoria CHECK (categoria IN ('vinculante', 'nao-vinculante'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Preenche automaticamente: súmulas cujo título contém "vinculante"
UPDATE sumulas
SET categoria = 'vinculante'
WHERE lower(title) LIKE '%vinculante%'
  AND categoria = 'nao-vinculante';

-- 3. Recria get_sumula_details incluindo o campo categoria
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
  categoria       text,
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
    s.categoria,
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
