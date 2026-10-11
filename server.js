const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const MENU_FILE = path.join(DATA_DIR, 'menu.json');
fs.mkdirSync(DATA_DIR, { recursive: true });
for (const file of [ORDERS_FILE, MESSAGES_FILE, MENU_FILE]) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, '[]', 'utf8');
}

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return []; }
}
function writeJson(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
function clean(value, max = 500) {
  return typeof value === 'string' ? value.trim().replace(/[<>]/g, '').slice(0, max) : '';
}
function adminOnly(req, res, next) {
  const expected = process.env.ADMIN_TOKEN;
  const supplied = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!expected) return res.status(503).json({ error: 'Admin is not configured. Set ADMIN_TOKEN in .env.' });
  const a = Buffer.from(supplied), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'Sunder Dhaba API' }));
app.get('/api/menu', (req, res) => {
  const category = clean(req.query.category, 40).toLowerCase();
  const items = readJson(MENU_FILE);
  res.json(category && category !== 'all' ? items.filter(i => i.category === category) : items);
});

// Submit an order request. This stores the request; it does not process online payments.
app.post('/api/orders', (req, res) => {
  const name = clean(req.body.name, 100);
  const phone = clean(req.body.phone, 20);
  const items = Array.isArray(req.body.items) ? req.body.items.slice(0, 30).map(i => ({
    name: clean(i.name, 100), quantity: Math.max(1, Math.min(99, Number.parseInt(i.quantity, 10) || 1)),
    notes: clean(i.notes, 200)
  })).filter(i => i.name) : [];
  const address = clean(req.body.address, 300);
  if (!name || !/^[-+()\s\d]{7,20}$/.test(phone) || !items.length) {
    return res.status(400).json({ error: 'Please provide a name, valid phone number, and at least one item.' });
  }
  const orders = readJson(ORDERS_FILE);
  const order = { id: crypto.randomUUID(), name, phone, address, items, status: 'pending', createdAt: new Date().toISOString() };
  orders.unshift(order); writeJson(ORDERS_FILE, orders);
  res.status(201).json({ message: 'Order request received. The restaurant should confirm it by phone.', orderId: order.id, status: order.status });
});

app.post('/api/contact', (req, res) => {
  const name = clean(req.body.name, 100), phone = clean(req.body.phone, 20), message = clean(req.body.message, 1500);
  if (!name || !message || (phone && !/^[-+()\s\d]{7,20}$/.test(phone))) return res.status(400).json({ error: 'Name and message are required; phone number must be valid.' });
  const messages = readJson(MESSAGES_FILE);
  const entry = { id: crypto.randomUUID(), name, phone, message, createdAt: new Date().toISOString() };
  messages.unshift(entry); writeJson(MESSAGES_FILE, messages);
  res.status(201).json({ message: 'Message received.' });
});

// Private admin endpoints: send Authorization: Bearer <ADMIN_TOKEN>.
app.get('/api/admin/orders', adminOnly, (req, res) => res.json(readJson(ORDERS_FILE)));
app.patch('/api/admin/orders/:id', adminOnly, (req, res) => {
  const allowed = ['pending', 'confirmed', 'preparing', 'completed', 'cancelled'];
  const status = clean(req.body.status, 20).toLowerCase();
  if (!allowed.includes(status)) return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
  const orders = readJson(ORDERS_FILE), order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.status = status; writeJson(ORDERS_FILE, orders); res.json(order);
});
app.get('/api/admin/messages', adminOnly, (req, res) => res.json(readJson(MESSAGES_FILE)));
app.put('/api/admin/menu/:id', adminOnly, (req, res) => {
  const items = readJson(MENU_FILE), index = items.findIndex(i => i.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: 'Menu item not found' });
  const current = items[index];
  items[index] = { ...current, name: clean(req.body.name, 100) || current.name,
    description: clean(req.body.description, 300) || current.description,
    category: clean(req.body.category, 40).toLowerCase() || current.category,
    prices: req.body.prices && typeof req.body.prices === 'object' ? req.body.prices : current.prices };
  writeJson(MENU_FILE, items); res.json(items[index]);
});

app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found' }));
app.listen(PORT, () => console.log(`Sunder Dhaba server running at http://localhost:${PORT}`));
