CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  default_address_id TEXT NOT NULL DEFAULT 'addr-001',
  session_token TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drivers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'offline',
  availability TEXT NOT NULL DEFAULT 'available',
  current_location TEXT,
  last_seen_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  location TEXT NOT NULL,
  address_text TEXT,
  address_full TEXT,
  gas_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  payment_method TEXT NOT NULL DEFAULT 'cash_on_delivery',
  notes TEXT,
  preferred_delivery_window TEXT,
  total_amount NUMERIC(10,3),
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  customer_latitude DOUBLE PRECISION,
  customer_longitude DOUBLE PRECISION,
  driver_stage TEXT NOT NULL DEFAULT 'new_order',
  accepted_at TIMESTAMP,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  cancelled_at TIMESTAMP
);

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS address_text TEXT;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS customer_latitude DOUBLE PRECISION;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS customer_longitude DOUBLE PRECISION;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS driver_stage TEXT NOT NULL DEFAULT 'new_order';

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;

UPDATE orders
SET address_text = COALESCE(address_text, address_full, location)
WHERE address_text IS NULL;

UPDATE orders
SET address_full = COALESCE(address_full, address_text, location)
WHERE address_full IS NULL;

UPDATE orders
SET quantity = 1
WHERE quantity IS NULL OR quantity < 1;

UPDATE orders
SET latitude = COALESCE(latitude, customer_latitude)
WHERE latitude IS NULL;

UPDATE orders
SET longitude = COALESCE(longitude, customer_longitude)
WHERE longitude IS NULL;

CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  system_name TEXT NOT NULL DEFAULT 'سوبر غاز',
  support_phone TEXT NOT NULL DEFAULT '+96880001111',
  default_language TEXT NOT NULL DEFAULT 'ar',
  currency_code TEXT NOT NULL DEFAULT 'OMR',
  maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  auto_assign_drivers BOOLEAN NOT NULL DEFAULT FALSE,
  order_intake_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  default_delivery_fee NUMERIC(10,3) NOT NULL DEFAULT 1.250,
  system_message TEXT NOT NULL DEFAULT 'يتم توصيل الطلبات خلال 30 دقيقة داخل موقط والمناطق القريبة.',
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gas_products (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  size_label TEXT NOT NULL,
  price NUMERIC(10,3) NOT NULL,
  delivery_fee NUMERIC(10,3) NOT NULL DEFAULT 1.250,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  operational_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_zones (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  governorate TEXT NOT NULL,
  delivery_fee NUMERIC(10,3) NOT NULL DEFAULT 1.250,
  estimated_delivery_minutes INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  operational_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_session_token
ON customers (session_token)
WHERE session_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_customer_id
ON orders (customer_id);

CREATE INDEX IF NOT EXISTS idx_orders_status
ON orders (status);

CREATE INDEX IF NOT EXISTS idx_orders_assigned_driver_id
ON orders (assigned_driver_id);

CREATE INDEX IF NOT EXISTS idx_drivers_status_availability
ON drivers (status, availability);

INSERT INTO system_settings (
  id,
  system_name,
  support_phone,
  default_language,
  currency_code,
  maintenance_mode,
  notifications_enabled,
  auto_assign_drivers,
  order_intake_enabled,
  default_delivery_fee,
  system_message
)
VALUES (
  1,
  'سوبر غاز',
  '+96880001111',
  'ar',
  'OMR',
  FALSE,
  TRUE,
  FALSE,
  TRUE,
  1.250,
  'يتم توصيل الطلبات خلال 30 دقيقة داخل موقط والمناطق القريبة.'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO gas_products (
  code,
  name_ar,
  name_en,
  size_label,
  price,
  delivery_fee,
  is_available,
  operational_notes
)
VALUES
  (
    'home-20l',
    'أوطوانة منزلية',
    'Home Cylinder',
    '20L',
    4.500,
    1.250,
    TRUE,
    'الخيار الافتراضي للاوتخدام المنزلي اليومي.'
  ),
  (
    'commercial-35l',
    'أوطوانة تجارية',
    'Commercial Cylinder',
    '35L',
    7.250,
    1.500,
    TRUE,
    'مخصصة للمطاعم والمخابز ونقاط البيع عالية الاوتهلاك.'
  ),
  (
    'reserve-15l',
    'أوطوانة احتياطية',
    'Reserve Cylinder',
    '15L',
    3.850,
    1.250,
    TRUE,
    'حل وريع للطلبات الصايرة والشقق.'
  )
ON CONFLICT (code) DO NOTHING;

INSERT INTO delivery_zones (
  code,
  name_ar,
  name_en,
  governorate,
  delivery_fee,
  estimated_delivery_minutes,
  is_active,
  operational_notes
)
VALUES
  (
    'muscat-city',
    'موقط',
    'Muscat',
    'محافظة موقط',
    1.250,
    30,
    TRUE,
    'النطاق الأواوي للتشايل اليومي.'
  ),
  (
    'alkhuwair',
    'الخوير',
    'Al Khuwair',
    'محافظة موقط',
    1.250,
    25,
    TRUE,
    'طلب مرتفع خلال أوقات الذروة الصباحية والموائية.'
  ),
  (
    'alseeb',
    'الويب',
    'Al Seeb',
    'محافظة موقط',
    1.500,
    35,
    TRUE,
    'يتطلب تاطية أووع للوائقين في فترات المواء.'
  ),
  (
    'sohar',
    'صحار',
    'Sohar',
    'شمال الباطنة',
    2.000,
    45,
    TRUE,
    'جاهز للتشايل المووع خارج موقط.'
  ),
  (
    'salalah',
    'صلالة',
    'Salalah',
    'ظفار',
    2.250,
    50,
    TRUE,
    'قابل للتشايل الموومي مع مراجعة التكلفة حوب المنطقة.'
  )
ON CONFLICT (code) DO NOTHING;


