-- ============================================================
-- Módulo de Cadastrados / Newsletter
-- Run in: https://supabase.com/dashboard/project/rjitzozuzonlnvczuvcy/sql/new
-- ============================================================

-- Step 1: Tables
CREATE TABLE IF NOT EXISTS subscribers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  email      text,
  whatsapp   text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_subscriber_contact CHECK (email IS NOT NULL OR whatsapp IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriber_email
  ON subscribers (lower(email)) WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriber_whatsapp
  ON subscribers (whatsapp) WHERE whatsapp IS NOT NULL;

CREATE TABLE IF NOT EXISTS subscriber_topicos (
  subscriber_id uuid NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  topico_id     uuid NOT NULL REFERENCES topicos(id) ON DELETE CASCADE,
  PRIMARY KEY (subscriber_id, topico_id)
);

-- Step 2: RLS
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriber_topicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allow_anon_insert ON subscribers;
CREATE POLICY allow_anon_insert ON subscribers FOR INSERT TO anon WITH CHECK (true);

-- SELECT on subscribers is blocked for anon: admin reads via SECURITY DEFINER RPC.
-- This prevents the anon key from being used to scrape personal data (email/whatsapp).

DROP POLICY IF EXISTS allow_anon_insert ON subscriber_topicos;
DROP POLICY IF EXISTS allow_anon_select ON subscriber_topicos;
CREATE POLICY allow_anon_insert ON subscriber_topicos FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY allow_anon_select ON subscriber_topicos FOR SELECT TO anon USING (true);

-- Step 3: RPC for admin listing (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION search_subscribers(
  p_search_term text    DEFAULT '',
  p_topico_id   uuid    DEFAULT NULL,
  p_limit       int     DEFAULT 100,
  p_offset      int     DEFAULT 0
)
RETURNS TABLE (
  id         uuid,
  name       text,
  email      text,
  whatsapp   text,
  created_at timestamptz,
  topicos    json,
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
    AND (p_topico_id IS NULL
         OR EXISTS (
           SELECT 1 FROM subscriber_topicos st
           WHERE st.subscriber_id = s.id AND st.topico_id = p_topico_id
         ));

  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s.email,
    s.whatsapp,
    s.created_at,
    COALESCE(
      (SELECT json_agg(json_build_object('id', t.id, 'name', t.name))
       FROM subscriber_topicos st
       JOIN topicos t ON t.id = st.topico_id
       WHERE st.subscriber_id = s.id),
      '[]'::json
    ) AS topicos,
    v_total
  FROM subscribers s
  WHERE
    (p_search_term = ''
     OR s.name     ILIKE '%' || p_search_term || '%'
     OR s.email    ILIKE '%' || p_search_term || '%'
     OR s.whatsapp ILIKE '%' || p_search_term || '%')
    AND (p_topico_id IS NULL
         OR EXISTS (
           SELECT 1 FROM subscriber_topicos st
           WHERE st.subscriber_id = s.id AND st.topico_id = p_topico_id
         ))
  ORDER BY s.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION search_subscribers(text, uuid, int, int) TO anon, authenticated;

-- Step 4: RPC for admin deletion
CREATE OR REPLACE FUNCTION delete_subscriber(p_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM subscribers WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_subscriber(uuid) TO anon, authenticated;
