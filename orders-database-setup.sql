-- Database setup for orders system

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  total_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  shipping_address TEXT NOT NULL, -- JSON string containing address details
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  jersey_id UUID REFERENCES jerseys(id) ON DELETE CASCADE,
  size TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price NUMERIC NOT NULL, -- Price at time of order (snapshot)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_jersey_id ON order_items(jersey_id);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_orders_updated_at 
  BEFORE UPDATE ON orders 
  FOR EACH ROW EXECUTE FUNCTION update_orders_updated_at();

-- Enable Row Level Security (RLS) if needed
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Create policies for user access (adjust according to your auth setup)
-- Users can only see their own orders
-- CREATE POLICY "Users can view own orders" ON orders
--   FOR SELECT USING (auth.uid() = user_id);

-- CREATE POLICY "Users can view own order items" ON order_items
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM orders 
--       WHERE orders.id = order_items.order_id 
--       AND orders.user_id = auth.uid()
--     )
--   );

-- Sample data for testing (optional)
-- INSERT INTO orders (user_id, total_amount, status, payment_status, shipping_address) VALUES
--   ('your-user-id-here', 2500, 'pending', 'pending', '{"fullName": "John Doe", "address": "123 Main St", "city": "Mumbai", "state": "Maharashtra", "pincode": "400001"}');

-- INSERT INTO order_items (order_id, jersey_id, size, quantity, price) VALUES
--   ('your-order-id-here', 'your-jersey-id-here', 'M', 1, 1500); 