-- ============================================================
-- Migration incremental — Módulo de Cadastrados
-- Seguro para rodar mesmo que já tenha executado create_subscribers.sql antes.
-- Run in: https://supabase.com/dashboard/project/rjitzozuzonlnvczuvcy/sql/new
-- ============================================================

-- 1. Garante que a coluna name é nullable (caso tenha sido criada como NOT NULL)
ALTER TABLE IF EXISTS subscribers
  ALTER COLUMN name DROP NOT NULL;

-- 2. Cria a tabela subscriber_sumulas (substitui subscriber_topicos)
CREATE TABLE IF NOT EXISTS subscriber_sumulas (
  subscriber_id uuid NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  sumula_id     uuid NOT NULL REFERENCES sumulas(id)     ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subscriber_id, sumula_id)
);

-- RLS na nova tabela
ALTER TABLE subscriber_sumulas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_anon_insert ON subscriber_sumulas;
DROP POLICY IF EXISTS allow_anon_select ON subscriber_sumulas;
CREATE POLICY allow_anon_insert ON subscriber_sumulas FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY allow_anon_select ON subscriber_sumulas FOR SELECT TO anon USING (true);

-- 3. Função upsert chamada pelo widget público
CREATE OR REPLACE FUNCTION upsert_subscriber_sumula(
  p_name      text,
  p_email     text,
  p_whatsapp  text,
  p_sumula_id uuid
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_sub_id uuid;
BEGIN
  -- Encontra cadastro existente pelo e-mail ou whatsapp
  SELECT id INTO v_sub_id
  FROM subscribers
  WHERE (p_email    IS NOT NULL AND lower(email)    = lower(p_email))
     OR (p_whatsapp IS NOT NULL AND whatsapp         = p_whatsapp)
  LIMIT 1;

  IF v_sub_id IS NULL THEN
    INSERT INTO subscribers(name, email, whatsapp)
    VALUES (
      NULLIF(trim(coalesce(p_name, '')), ''),
      NULLIF(trim(coalesce(p_email, '')), ''),
      NULLIF(trim(coalesce(p_whatsapp, '')), '')
    )
    RETURNING id INTO v_sub_id;
  ELSIF NULLIF(trim(coalesce(p_name, '')), '') IS NOT NULL THEN
    UPDATE subscribers SET name = trim(p_name) WHERE id = v_sub_id AND name IS NULL;
  END IF;

  -- Vincula à súmula (sem duplicar)
  INSERT INTO subscriber_sumulas(subscriber_id, sumula_id)
  VALUES (v_sub_id, p_sumula_id)
  ON CONFLICT DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_subscriber_sumula(text, text, text, uuid) TO anon, authenticated;

-- 4. Função de listagem para o painel administrativo
DROP FUNCTION IF EXISTS search_subscribers(text, uuid, int, int);
CREATE OR REPLACE FUNCTION search_subscribers(
  p_search_term text DEFAULT '',
  p_sumula_id   uuid DEFAULT NULL,
  p_limit       int  DEFAULT 100,
  p_offset      int  DEFAULT 0
)
RETURNS TABLE (
  id          uuid,
  name        text,
  email       text,
  whatsapp    text,
  created_at  timestamptz,
  sumulas     json,
  total_count bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_total bigint;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM subscribers s
  WHERE
    (p_search_term = ''
     OR s.name     ILIKE '%' || p_search_term || '%'
     OR s.email    ILIKE '%' || p_search_term || '%'
     OR s.whatsapp ILIKE '%' || p_search_term || '%')
    AND (p_sumula_id IS NULL
         OR EXISTS (
           SELECT 1 FROM subscriber_sumulas ss
           WHERE ss.subscriber_id = s.id AND ss.sumula_id = p_sumula_id
         ));

  RETURN QUERY
  SELECT
    s.id, s.name, s.email, s.whatsapp, s.created_at,
    COALESCE(
      (SELECT json_agg(json_build_object('id', sm.id, 'title', sm.title) ORDER BY sm.title)
       FROM subscriber_sumulas ss
       JOIN sumulas sm ON sm.id = ss.sumula_id
       WHERE ss.subscriber_id = s.id),
      '[]'::json
    ) AS sumulas,
    v_total
  FROM subscribers s
  WHERE
    (p_search_term = ''
     OR s.name     ILIKE '%' || p_search_term || '%'
     OR s.email    ILIKE '%' || p_search_term || '%'
     OR s.whatsapp ILIKE '%' || p_search_term || '%')
    AND (p_sumula_id IS NULL
         OR EXISTS (
           SELECT 1 FROM subscriber_sumulas ss
           WHERE ss.subscriber_id = s.id AND ss.sumula_id = p_sumula_id
         ))
  ORDER BY s.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION search_subscribers(text, uuid, int, int) TO anon, authenticated;

-- 5. Função de exclusão para o painel administrativo
CREATE OR REPLACE FUNCTION delete_subscriber(p_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM subscribers WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_subscriber(uuid) TO anon, authenticated;
