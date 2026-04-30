-- ============================================================
-- topicos + sumula_topicos: complete RLS fix
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. topicos table
ALTER TABLE topicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allow_anon_select ON topicos;
DROP POLICY IF EXISTS allow_anon_insert ON topicos;
DROP POLICY IF EXISTS allow_anon_update ON topicos;
DROP POLICY IF EXISTS allow_anon_delete ON topicos;

CREATE POLICY allow_anon_select ON topicos FOR SELECT TO anon USING (true);
CREATE POLICY allow_anon_insert ON topicos FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY allow_anon_update ON topicos FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY allow_anon_delete ON topicos FOR DELETE TO anon USING (true);

-- 2. sumula_topicos table (relação M:N)
ALTER TABLE sumula_topicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allow_anon_select ON sumula_topicos;
DROP POLICY IF EXISTS allow_anon_insert ON sumula_topicos;
DROP POLICY IF EXISTS allow_anon_update ON sumula_topicos;
DROP POLICY IF EXISTS allow_anon_delete ON sumula_topicos;

CREATE POLICY allow_anon_select ON sumula_topicos FOR SELECT TO anon USING (true);
CREATE POLICY allow_anon_insert ON sumula_topicos FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY allow_anon_update ON sumula_topicos FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY allow_anon_delete ON sumula_topicos FOR DELETE TO anon USING (true);
