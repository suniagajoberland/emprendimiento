const bcrypt = require('bcryptjs');
const db = require('./database');
const bcv = require('../services/bcv');
const ordersService = require('../services/orders');
const { daysAgo, nowLocal, todayLocal } = require('../utils/datetime');

const fresh = process.argv.includes('--fresh');

function resetTables() {
  db.exec(`
    DROP TABLE IF EXISTS commissions;
    DROP TABLE IF EXISTS order_items;
    DROP TABLE IF EXISTS orders;
    DROP TABLE IF EXISTS exchange_rates;
    DROP TABLE IF EXISTS products;
    DROP TABLE IF EXISTS categories;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS sessions;
  `);
  const fs = require('fs');
  const path = require('path');
  db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
}

async function seedRates() {
  const fetched = await bcv.fetchLatestRate();
  const latest = fetched ? fetched.rate : 880.1159;
  const source = fetched ? fetched.source : 'seed-fallback';
  const base = [0.9602, 0.9686, 0.9782, 0.9899, 1];
  base.forEach((factor, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (base.length - 1 - i));
    const date = i === base.length - 1 && fetched ? fetched.date : todayLocal(d);
    bcv.upsertRate(date, Math.round(latest * factor * 10000) / 10000, source);
  });
  return bcv.getLatestRate();
}

function renumberOrders() {
  const all = db.prepare('SELECT id, created_at FROM orders ORDER BY created_at ASC').all();
  const counters = {};
  const stmt = db.prepare('UPDATE orders SET order_number = ? WHERE id = ?');
  for (const o of all) {
    const day = o.created_at.slice(0, 10).replace(/-/g, '');
    counters[day] = (counters[day] || 0) + 1;
    stmt.run(`ORD-${day}-${String(counters[day]).padStart(3, '0')}`, o.id);
  }
}

async function main() {
  const already = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (already && !fresh) {
    console.log('Ya hay datos en la base. Ejecuta "npm run seed -- --fresh" para reiniciar.');
    return;
  }
  if (fresh) resetTables();

  const now = nowLocal();
  const insertUser = db.prepare(
    'INSERT INTO users (username, password_hash, full_name, role, commission_pct, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)'
  );
  const adminId = insertUser.run('admin', bcrypt.hashSync('admin123', 10), 'Administrador', 'admin', 0, now).lastInsertRowid;
  const asesor1Id = insertUser.run('asesor1', bcrypt.hashSync('asesor123', 10), 'Ana Asesora', 'advisor', 5, now).lastInsertRowid;
  const asesor2Id = insertUser.run('asesor2', bcrypt.hashSync('asesor123', 10), 'Carlos Asesor', 'advisor', 7.5, now).lastInsertRowid;

  const insertCategory = db.prepare('INSERT INTO categories (name, description, created_at) VALUES (?, ?, ?)');
  const catPerf = insertCategory.run('Perfumería', 'Fragancias y sets', now).lastInsertRowid;
  const catRel = insertCategory.run('Relojes', 'Relojes clásicos y deportivos', now).lastInsertRowid;
  const catAcc = insertCategory.run('Accesorios', 'Carteras, gafas y más', now).lastInsertRowid;
  const catCal = insertCategory.run('Calzado', 'Zapatos y sneakers', now).lastInsertRowid;

  const insertProduct = db.prepare(
    'INSERT INTO products (category_id, name, sku, price_usd, stock, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)'
  );
  const p = {};
  p.perfume = insertProduct.run(catPerf, 'Eau de Parfum Royal 100ml', 'PERF-001', 89.99, 25, now).lastInsertRowid;
  p.set = insertProduct.run(catPerf, 'Set Descubrimiento 5x8ml', 'PERF-002', 34.5, 40, now).lastInsertRowid;
  p.relojOro = insertProduct.run(catRel, 'Reloj Clásico Oro 40mm', 'REL-001', 159, 12, now).lastInsertRowid;
  p.relojDep = insertProduct.run(catRel, 'Reloj Deportivo Acero', 'REL-002', 99.5, 18, now).lastInsertRowid;
  p.cartera = insertProduct.run(catAcc, 'Cartera Cuero Premium', 'ACC-001', 75, 20, now).lastInsertRowid;
  p.gafas = insertProduct.run(catAcc, 'Gafas de Sol Aviador', 'ACC-002', 45, 30, now).lastInsertRowid;
  p.zapatos = insertProduct.run(catCal, 'Zapatos Formales Cuero', 'CAL-001', 110, 15, now).lastInsertRowid;
  p.sneakers = insertProduct.run(catCal, 'Sneakers Edición Limitada', 'CAL-002', 85, 22, now).lastInsertRowid;

  const rate = await seedRates();

  const o1 = ordersService.createOrder({
    userId: asesor1Id,
    commissionPct: 5,
    customerName: 'María González',
    customerPhone: '0414-1234567',
    items: [
      { productId: p.perfume, quantity: 2, unitPriceUsd: 89.99 },
      { productId: p.gafas, quantity: 1, unitPriceUsd: 45 }
    ],
    notes: 'Entrega en tienda'
  });
  const o2 = ordersService.createOrder({
    userId: asesor2Id,
    commissionPct: 7.5,
    customerName: 'José Ramírez',
    customerPhone: '0424-7654321',
    items: [
      { productId: p.relojOro, quantity: 1, unitPriceUsd: 159 },
      { productId: p.cartera, quantity: 1, unitPriceUsd: 75 }
    ],
    notes: ''
  });
  const o3 = ordersService.createOrder({
    userId: asesor1Id,
    commissionPct: 5,
    customerName: 'Laura Méndez',
    customerPhone: '0412-9998877',
    items: [{ productId: p.sneakers, quantity: 1, unitPriceUsd: 85 }],
    notes: 'Reserva del 50%'
  });

  db.prepare('UPDATE orders SET created_at = ?, updated_at = ?, status = ? WHERE id = ?').run(daysAgo(0, '11:30:00'), daysAgo(0, '11:30:00'), 'paid', o1.order.id);
  db.prepare('UPDATE orders SET created_at = ?, updated_at = ?, status = ? WHERE id = ?').run(daysAgo(1, '16:45:00'), daysAgo(1, '17:00:00'), 'shipped', o2.order.id);
  db.prepare('UPDATE orders SET created_at = ?, updated_at = ?, status = ? WHERE id = ?').run(daysAgo(2, '09:15:00'), daysAgo(2, '09:15:00'), 'pending', o3.order.id);
  db.prepare('UPDATE commissions SET status = ? WHERE order_id = ?').run('paid', o1.order.id);
  db.prepare('UPDATE commissions SET status = ? WHERE order_id = ?').run('paid', o2.order.id);

  renumberOrders();

  console.log('Datos sembrados correctamente.');
  console.log(`Tasa BCV más reciente: Bs ${rate.rate_bs} (${rate.rate_date}, ${rate.source})`);
  console.log('');
  console.log('Usuarios de prueba:');
  console.log('  admin   / admin123   (administrador)');
  console.log('  asesor1 / asesor123  (asesor, comisión 5%)');
  console.log('  asesor2 / asesor123  (asesor, comisión 7.5%)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
