# Sunder Dhaba website backend

This Node.js + Express starter serves your existing website and provides API endpoints for menu items, order requests, contact messages, and protected admin operations. Data is stored in local JSON files, so this is suitable for a demo/small prototype. For production, use a hosted database and deploy on a persistent-volume host.

## Run locally
1. Install Node.js 18 or newer.
2. In this folder run `npm install`.
3. Copy `.env.example` to `.env` and set `ADMIN_TOKEN` to a long random secret.
4. Run `npm start`.
5. Open `http://localhost:3000`.

## API
- `GET /api/health` — server status
- `GET /api/menu` or `GET /api/menu?category=paneer` — menu list
- `POST /api/orders` — JSON `{ "name":"Abhi", "phone":"9876543210", "address":"", "items":[{"name":"Shahi Paneer","quantity":1,"notes":""}] }`
- `POST /api/contact` — JSON `{ "name":"Abhi", "phone":"9876543210", "message":"Please call me" }`
- `GET /api/admin/orders` — requires `Authorization: Bearer YOUR_ADMIN_TOKEN`
- `PATCH /api/admin/orders/:id` — requires admin token; JSON `{ "status":"confirmed" }`
- `GET /api/admin/messages` — requires admin token
- `PUT /api/admin/menu/:id` — requires admin token; updates menu item fields

Allowed order statuses: `pending`, `confirmed`, `preparing`, `completed`, `cancelled`.

## Important
- The original HTML menu/filter UI is included unchanged in `public/index.html`; the backend API is available separately. The current static page does not yet submit its buttons to these endpoints.
- Order endpoint records an order request only. No payment gateway, WhatsApp/SMS notifications, or real-time delivery integration is configured.
- `data/menu.json` is pre-populated with the menu items extracted from your HTML file. Price labels are preserved as displayed in the source website. Each item has `id`, `name`, `category`, `description`, and a `prices` array of display strings.
