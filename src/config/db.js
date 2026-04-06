const { Pool } = require("pg");

const baseDbConfig = {
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD ?? ""),
  database: process.env.DB_NAME
};

let pool = null;

function resolveCandidateHosts() {
  const configuredHost = process.env.DB_HOST || "localhost";

  if (configuredHost === "postgres") {
    return ["postgres", "localhost"];
  }

  return [configuredHost];
}

async function getPool() {
  if (pool) {
    return pool;
  }

  const hosts = resolveCandidateHosts();
  let lastError;

  for (const host of hosts) {
    const candidatePool = new Pool({
      ...baseDbConfig,
      host
    });

    try {
      const client = await candidatePool.connect();
      client.release();
      pool = candidatePool;

      if (host !== hosts[0]) {
        console.log(`Database host fallback active: using ${host}`);
      }

      return pool;
    } catch (error) {
      lastError = error;
      await candidatePool.end().catch(() => {});
    }
  }

  throw lastError;
}

const createCustomersTableQuery = `
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
`;

const createDriversTableQuery = `
  CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT,
    phone TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT,
    session_token TEXT,
    status TEXT NOT NULL DEFAULT 'offline',
    availability TEXT NOT NULL DEFAULT 'available',
    current_location TEXT,
    current_latitude DOUBLE PRECISION,
    current_longitude DOUBLE PRECISION,
    last_location_at TIMESTAMP,
    vehicle_label TEXT,
    license_number TEXT,
    fcm_token TEXT,
    last_seen_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
`;

const createOrdersTableQuery = `
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
    current_candidate_driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    customer_latitude DOUBLE PRECISION,
    customer_longitude DOUBLE PRECISION,
    driver_stage TEXT NOT NULL DEFAULT 'new_order',
    attempted_driver_ids INTEGER[] NOT NULL DEFAULT '{}',
    dispatch_started_at TIMESTAMP,
    dispatch_expires_at TIMESTAMP,
    accepted_at TIMESTAMP,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    cancelled_at TIMESTAMP
  );
`;

const createDriverOrderRejectionsTableQuery = `
  CREATE TABLE IF NOT EXISTS driver_order_rejections (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    reason TEXT,
    rejected_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (driver_id, order_id)
  );
`;

const alterDriversTableQueries = [
  `
    ALTER TABLE drivers
    ADD COLUMN IF NOT EXISTS username TEXT;
  `,
  `
    ALTER TABLE drivers
    ADD COLUMN IF NOT EXISTS email TEXT;
  `,
  `
    ALTER TABLE drivers
    ADD COLUMN IF NOT EXISTS password_hash TEXT;
  `,
  `
    ALTER TABLE drivers
    ADD COLUMN IF NOT EXISTS session_token TEXT;
  `,
  `
    ALTER TABLE drivers
    ADD COLUMN IF NOT EXISTS current_latitude DOUBLE PRECISION;
  `,
  `
    ALTER TABLE drivers
    ADD COLUMN IF NOT EXISTS current_longitude DOUBLE PRECISION;
  `,
  `
    ALTER TABLE drivers
    ADD COLUMN IF NOT EXISTS last_location_at TIMESTAMP;
  `,
  `
    ALTER TABLE drivers
    ADD COLUMN IF NOT EXISTS vehicle_label TEXT;
  `,
  `
    ALTER TABLE drivers
    ADD COLUMN IF NOT EXISTS license_number TEXT;
  `,
  `
    ALTER TABLE drivers
    ADD COLUMN IF NOT EXISTS fcm_token TEXT;
  `,
  `
    UPDATE drivers
    SET username = CONCAT('driver-id-', id)
    WHERE username IS NULL
       OR BTRIM(username) = '';
  `
];

const createSystemSettingsTableQuery = `
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
`;

const createGasProductsTableQuery = `
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
`;

const createDeliveryZonesTableQuery = `
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
`;

const alterOrdersTableQueries = [
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS address_text TEXT;
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS address_full TEXT;
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash_on_delivery';
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS notes TEXT;
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS preferred_delivery_window TEXT;
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,3);
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS assigned_driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL;
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS current_candidate_driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL;
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS customer_latitude DOUBLE PRECISION;
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS customer_longitude DOUBLE PRECISION;
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS driver_stage TEXT NOT NULL DEFAULT 'new_order';
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS attempted_driver_ids INTEGER[] NOT NULL DEFAULT '{}';
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS dispatch_started_at TIMESTAMP;
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS dispatch_expires_at TIMESTAMP;
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP;
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;
  `,
  `
    UPDATE orders
    SET updated_at = COALESCE(updated_at, created_at)
    WHERE updated_at IS NULL;
  `,
  `
    UPDATE orders
    SET address_text = COALESCE(address_text, address_full, location)
    WHERE address_text IS NULL;
  `,
  `
    UPDATE orders
    SET address_full = COALESCE(address_full, address_text, location)
    WHERE address_full IS NULL;
  `,
  `
    UPDATE orders
    SET quantity = 1
    WHERE quantity IS NULL OR quantity < 1;
  `,
  `
    UPDATE orders
    SET latitude = COALESCE(latitude, customer_latitude)
    WHERE latitude IS NULL;
  `,
  `
    UPDATE orders
    SET longitude = COALESCE(longitude, customer_longitude)
    WHERE longitude IS NULL;
  `,
  `
    UPDATE orders
    SET driver_stage = CASE
      WHEN status = 'pending' THEN 'searching_driver'
      WHEN status = 'accepted' THEN 'accepted'
      WHEN status = 'delivered' THEN 'delivered'
      WHEN status = 'cancelled' THEN 'cancelled'
      ELSE COALESCE(driver_stage, 'searching_driver')
    END
    WHERE driver_stage IS NULL
       OR driver_stage = ''
       OR (status = 'pending' AND driver_stage = 'new_order');
  `,
  `
    UPDATE orders
    SET attempted_driver_ids = '{}'
    WHERE attempted_driver_ids IS NULL;
  `,
  `
    UPDATE orders
    SET current_candidate_driver_id = NULL
    WHERE status <> 'pending';
  `,
  `
    UPDATE orders
    SET dispatch_started_at = NULL,
        dispatch_expires_at = NULL
    WHERE status <> 'pending';
  `,
  `
    UPDATE orders
    SET accepted_at = COALESCE(accepted_at, updated_at, created_at)
    WHERE status = 'accepted'
      AND accepted_at IS NULL;
  `,
  `
    UPDATE orders
    SET delivered_at = COALESCE(delivered_at, updated_at, created_at)
    WHERE status = 'delivered'
      AND delivered_at IS NULL;
  `
];

const createCustomerSessionIndexQuery = `
  CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_session_token
  ON customers (session_token)
  WHERE session_token IS NOT NULL;
`;

const createOrderCustomerIndexQuery = `
  CREATE INDEX IF NOT EXISTS idx_orders_customer_id
  ON orders (customer_id);
`;

const createOrderStatusIndexQuery = `
  CREATE INDEX IF NOT EXISTS idx_orders_status
  ON orders (status);
`;

const createOrderDriverIndexQuery = `
  CREATE INDEX IF NOT EXISTS idx_orders_assigned_driver_id
  ON orders (assigned_driver_id);
`;

const createOrderCandidateDriverIndexQuery = `
  CREATE INDEX IF NOT EXISTS idx_orders_current_candidate_driver_id
  ON orders (current_candidate_driver_id);
`;

const createOrderDispatchStageIndexQuery = `
  CREATE INDEX IF NOT EXISTS idx_orders_dispatch_stage
  ON orders (status, driver_stage, dispatch_expires_at);
`;

const createDriversStatusIndexQuery = `
  CREATE INDEX IF NOT EXISTS idx_drivers_status_availability
  ON drivers (status, availability);
`;

const createDriverSessionIndexQuery = `
  CREATE UNIQUE INDEX IF NOT EXISTS idx_drivers_session_token
  ON drivers (session_token)
  WHERE session_token IS NOT NULL;
`;

const createDriverEmailIndexQuery = `
  CREATE UNIQUE INDEX IF NOT EXISTS idx_drivers_email_unique
  ON drivers (LOWER(email))
  WHERE email IS NOT NULL;
`;

const createDriverUsernameIndexQuery = `
  CREATE UNIQUE INDEX IF NOT EXISTS idx_drivers_username_unique
  ON drivers (LOWER(username))
  WHERE username IS NOT NULL;
`;

const createDriverOrderRejectionsIndexQuery = `
  CREATE UNIQUE INDEX IF NOT EXISTS idx_driver_order_rejections_driver_order
  ON driver_order_rejections (driver_id, order_id);
`;

const seedSystemSettingsQuery = `
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
`;

const seedGasProductsQuery = `
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
`;

const seedDeliveryZonesQuery = `
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
`;

async function initializeDatabase(retries = 15, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    let client;

    try {
      const resolvedPool = await getPool();
      client = await resolvedPool.connect();
      await client.query(createCustomersTableQuery);
      await client.query(createDriversTableQuery);
      await client.query(createOrdersTableQuery);
      await client.query(createDriverOrderRejectionsTableQuery);
      await client.query(createSystemSettingsTableQuery);
      await client.query(createGasProductsTableQuery);
      await client.query(createDeliveryZonesTableQuery);

      for (const queryText of alterDriversTableQueries) {
        await client.query(queryText);
      }

      for (const queryText of alterOrdersTableQueries) {
        await client.query(queryText);
      }

      await client.query(createCustomerSessionIndexQuery);
      await client.query(createOrderCustomerIndexQuery);
      await client.query(createOrderStatusIndexQuery);
      await client.query(createOrderDriverIndexQuery);
      await client.query(createOrderCandidateDriverIndexQuery);
      await client.query(createOrderDispatchStageIndexQuery);
      await client.query(createDriversStatusIndexQuery);
      await client.query(createDriverSessionIndexQuery);
      await client.query(createDriverEmailIndexQuery);
      await client.query(createDriverUsernameIndexQuery);
      await client.query(createDriverOrderRejectionsIndexQuery);

      await client.query(seedSystemSettingsQuery);
      await client.query(seedGasProductsQuery);
      await client.query(seedDeliveryZonesQuery);

      console.log("Database is connected and ready.");
      return;
    } catch (error) {
      console.error(
        `Database connection attempt ${attempt}/${retries} failed: ${error.message}`
      );

      if (attempt === retries) {
        throw error;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, delayMs);
      });
    } finally {
      if (client) {
        client.release();
      }
    }
  }
}

function query(text, params) {
  return getPool().then((resolvedPool) => resolvedPool.query(text, params));
}

module.exports = {
  getPool,
  query,
  initializeDatabase
};

Object.defineProperty(module.exports, "pool", {
  enumerable: true,
  get() {
    return pool;
  }
});


