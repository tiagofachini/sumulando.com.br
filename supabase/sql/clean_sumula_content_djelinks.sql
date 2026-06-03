-- ============================================================
-- Remove ",DJe DD/MM/YYYY,https://scon.stj.jus.br/..." suffix
-- from sumulas content and set publish_date from extracted date.
-- Run in: https://supabase.com/dashboard/project/rjitzozuzonlnvczuvcy/sql/new
-- ============================================================

-- Preview (run this first to confirm affected rows)
-- SELECT id, title,
--   substring(content from ',DJe (\d{2}/\d{2}/\d{4}),') AS extracted_date,
--   right(content, 80) AS content_tail
-- FROM sumulas
-- WHERE content ~ ',DJe \d{2}/\d{2}/\d{4},https://scon\.stj\.jus\.br/'
-- ORDER BY title;

-- Update: extract date → set publish_date, remove trailing pattern from content
UPDATE sumulas
SET
  publish_date = to_date(
    substring(content FROM ',DJe (\d{2}/\d{2}/\d{4}),'),
    'DD/MM/YYYY'
  ),
  content = regexp_replace(
    content,
    ',DJe \d{2}/\d{2}/\d{4},https://scon\.stj\.jus\.br/[^'']*',
    '',
    'g'
  )
WHERE content ~ ',DJe \d{2}/\d{2}/\d{4},https://scon\.stj\.jus\.br/';

-- Confirm result
SELECT id, title, publish_date, right(content, 60) AS content_tail
FROM sumulas
WHERE publish_date IS NOT NULL
ORDER BY publish_date DESC
LIMIT 20;
