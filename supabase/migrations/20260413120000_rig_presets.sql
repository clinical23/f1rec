-- Rig builder preset templates (run via Supabase migrations or SQL editor)
CREATE TABLE IF NOT EXISTS rig_presets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  tier text NOT NULL CHECK (tier IN ('budget', 'mid-range', 'high-end', 'ultimate')),
  total_price numeric(10,2),
  currency text DEFAULT 'GBP',
  product_ids uuid[] NOT NULL DEFAULT '{}',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rig_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read rig_presets" ON rig_presets
  FOR SELECT USING (true);

INSERT INTO rig_presets (name, slug, description, tier, sort_order, product_ids)
VALUES
  ('Starter Rig', 'starter-rig', 'Get into sim racing without breaking the bank. Perfect for beginners.', 'budget', 1, '{}'),
  ('Club Racer', 'club-racer', 'The sweet spot — serious hardware at a reasonable price.', 'mid-range', 2, '{}'),
  ('Pro Setup', 'pro-setup', 'Race-winning gear. Direct drive, load cell pedals, aluminium rig.', 'high-end', 3, '{}'),
  ('Ultimate Dream', 'ultimate-dream', 'Money no object. The absolute best of everything.', 'ultimate', 4, '{}')
ON CONFLICT (slug) DO NOTHING;
