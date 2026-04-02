# Oman Gas Driver App

Production-ready Flutter driver application for the gas cylinder delivery platform.

## Backend URLs

Centralized in:

- `lib/config/environment.dart`

Defaults:

- API: `http://10.0.2.2:5000/api`
- Socket.IO: `http://10.0.2.2:5000`

Override at build/run time:

```bash
flutter run \
  --dart-define=DRIVER_API_BASE_URL=http://YOUR_HOST:5000/api \
  --dart-define=DRIVER_SOCKET_BASE_URL=http://YOUR_HOST:5000
```

## Main integration points

Driver auth:

- `POST /api/driver-auth/register`
- `POST /api/driver-auth/login`
- `GET /api/driver-auth/me`
- `POST /api/driver-auth/logout`

Driver app operations:

- `GET /api/driver/dashboard`
- `GET /api/driver/profile`
- `PATCH /api/driver/availability`
- `PATCH /api/driver/location`
- `POST /api/driver/push-token`
- `GET /api/driver/orders/available`
- `GET /api/driver/orders/active`
- `GET /api/driver/orders/history`
- `GET /api/driver/orders/:id`
- `POST /api/driver/orders/:id/accept`
- `POST /api/driver/orders/:id/reject`
- `PATCH /api/driver/orders/:id/stage`
- `GET /api/driver/earnings/summary`
- `GET /api/driver/notifications`

Socket events used by the app:

- `new_order`
- `order_updated`
- `order_status_changed`
- `driver_notification`
- `driver_updated`
- `driver_location_updated`

## Maps

Android manifest placeholder:

- `DRIVER_GOOGLE_MAPS_API_KEY`

Pass it during build if needed:

```bash
flutter run --dart-define=DRIVER_GOOGLE_MAPS_API_KEY=YOUR_KEY
```

## Notes

- Firebase Cloud Messaging is prepared structurally through `NotificationService`, but native Firebase setup is still a TODO until project credentials are provided.
- If customer coordinates are not yet sent by the customer app/backend, the active delivery screen falls back to address-only navigation.
- On Windows, Gradle may fail when the repo path contains non-Latin characters. If that happens, build from an ASCII junction or move the repo to an ASCII-only path. The code itself builds correctly.
