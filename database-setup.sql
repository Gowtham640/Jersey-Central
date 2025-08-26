-- Database setup for homepage editor functionality

-- Create homepage_sections table
CREATE TABLE IF NOT EXISTS homepage_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('top-picks', 'best-deals', 'new-arrivals', 'trending', 'custom')),
  visible BOOLEAN DEFAULT true,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create homepage_products table to link products to sections
CREATE TABLE IF NOT EXISTS homepage_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID REFERENCES homepage_sections(id) ON DELETE CASCADE,
  jersey_id UUID REFERENCES jerseys(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(section_id, jersey_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_homepage_sections_order ON homepage_sections(order_index);
CREATE INDEX IF NOT EXISTS idx_homepage_sections_visible ON homepage_sections(visible);
CREATE INDEX IF NOT EXISTS idx_homepage_products_section ON homepage_products(section_id);
CREATE INDEX IF NOT EXISTS idx_homepage_products_order ON homepage_products(order_index);

-- Insert some default sections
INSERT INTO homepage_sections (title, type, visible, order_index) VALUES
  ('Top Picks', 'top-picks', true, 0),
  ('Best Deals', 'best-deals', true, 1),
  ('New Arrivals', 'new-arrivals', true, 2)
ON CONFLICT DO NOTHING;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_homepage_sections_updated_at 
  BEFORE UPDATE ON homepage_sections 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) if needed
-- ALTER TABLE homepage_sections ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE homepage_products ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access (adjust according to your auth setup)
-- CREATE POLICY "Admin can manage homepage sections" ON homepage_sections
--   FOR ALL USING (auth.role() = 'admin');

-- CREATE POLICY "Admin can manage homepage products" ON homepage_products
--   FOR ALL USING (auth.role() = 'admin'); 