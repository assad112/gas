# Gas Delivery Admin Platform

لوحة تحكم عربية احترافية لإدارة مشروع توصيل وبيع أسطوانات الغاز، مبنية باستخدام `Next.js App Router` فوق نفس خادم `Node.js + Express + PostgreSQL + Socket.IO`.

## التقنيات

- Next.js App Router
- React.js
- Tailwind CSS
- Axios
- Socket.IO Client + Server
- Node.js + Express
- PostgreSQL
- Docker

## البنية

```text
.
|-- app/                  # صفحات Next.js App Router
|-- components/           # مكونات الواجهة القابلة لإعادة الاستخدام
|-- data/                 # mock data منظمة
|-- hooks/                # hooks مخصصة
|-- lib/                  # utilities و formatters
|-- services/             # Axios + Socket.IO client
|-- src/                  # Express API + PostgreSQL + Socket.IO server
|-- database/             # SQL init
|-- Dockerfile
|-- docker-compose.yml
`-- package.json
```

## التشغيل عبر Docker

```bash
docker compose up --build
```

بعد التشغيل:

- لوحة التحكم: `http://localhost:3000`
- Dashboard: `http://localhost:3000/dashboard`
- Orders: `http://localhost:3000/orders`
- API: `http://localhost:3000/api/orders`

## التشغيل محلياً

```bash
npm install
npm run dev
```

## واجهات الـ API الحالية

### جميع الطلبات

```bash
curl http://localhost:3000/api/orders
```

### إنشاء طلب

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Ahmed\",\"phone\":\"+96891234567\",\"location\":\"Muscat - Al Khuwair\",\"gas_type\":\"20L\"}"
```

### تحديث حالة الطلب

```bash
curl -X PUT http://localhost:3000/api/orders/1
```

### فحص الصحة

```bash
curl http://localhost:3000/api/health
```

## التحديث المباشر

الخادم يرسل:

- `new_order`
- `order_updated`

ولوحة التحكم تتصل بـ Socket.IO تلقائياً وتحدّث الطلبات والبطاقات والإشعارات مباشرة.
