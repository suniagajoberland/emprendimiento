const db = require('../db/database');
const bcv = require('./bcv');
const { round2 } = require('../utils/money');
const { nowLocal, todayLocal } = require('../utils/datetime');

const VALID_STATUS = ['pending', 'paid', 'shipped', 'cancelled'];
const COMMISSION_STATUS = { pending: 'pending', paid: 'paid', shipped: 'paid', cancelled: 'cancelled' };

function orderNumberForToday() {
  const count = db
    .prepare("SELECT COUNT(*) AS n FROM orders WHERE substr(created_at, 1, 10) = ?")
    .get(todayLocal()).n;
  return `ORD-${todayLocal().replace(/-/g, '')}-${String(count + 1).padStart(3, '0')}`;
}

function createOrder({ userId, commissionPct, customerName, customerPhone, items, notes }) {
  if (!customerName) return { error: 'El nombre del cliente es obligatorio.' };
  if (!items.length) return { error: 'Agrega al menos un producto a la orden.' };

  const rate = bcv.getLatestRate();
  if (!rate) return { error: 'No hay tasa BCV registrada. Actualiza la tasa antes de crear órdenes.' };

  const lines = [];
  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(item.productId);
    if (!product) return { error: `Producto inválido (id ${item.productId}).` };
    const quantity = Number.isInteger(item.quantity) && item.quantity > 0 ? item.quantity : 0;
    if (!quantity) return { error: `Cantidad inválida para ${product.name}.` };
    if (product.stock < quantity) return { error: `Stock insuficiente para ${product.name} (disponible: ${product.stock}).` };
    const unitPrice = item.unitPriceUsd > 0 ? item.unitPriceUsd : product.price_usd;
    lines.push({ product, quantity, unitPrice, lineTotal: round2(quantity * unitPrice) });
  }

  const totalUsd = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));
  const totalBs = round2(totalUsd * rate.rate_bs);
  const pctValue = Number(commissionPct) || 0;
  const now = nowLocal();

  const tx = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO orders (order_number, user_id, customer_name, customer_phone, status, subtotal_usd, total_usd, exchange_rate_id, exchange_rate_bs, total_bs, commission_pct, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(orderNumberForToday(), userId, customerName, customerPhone || '', totalUsd, totalUsd, rate.id, rate.rate_bs, totalBs, pctValue, notes || '', now, now);

    const orderId = info.lastInsertRowid;
    const insertItem = db.prepare(
      'INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price_usd, line_total_usd) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
    for (const l of lines) {
      insertItem.run(orderId, l.product.id, l.product.name, l.quantity, l.unitPrice, l.lineTotal);
      updateStock.run(l.quantity, l.product.id);
    }

    const amountUsd = round2(totalUsd * (pctValue / 100));
    const amountBs = round2(amountUsd * rate.rate_bs);
    db.prepare(
      'INSERT INTO commissions (order_id, advisor_id, rate_pct, base_usd, amount_usd, amount_bs, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(orderId, userId, pctValue, totalUsd, amountUsd, amountBs, 'pending', now);

    return orderId;
  });

  const orderId = tx();
  return { order: getOrder(orderId) };
}

function getOrder(id) {
  const order = db
    .prepare(
      `SELECT o.*, u.full_name AS advisor_name, u.username AS advisor_username
       FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?`
    )
    .get(Number(id));
  if (!order) return null;
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(order.id);
  order.commission = db.prepare('SELECT * FROM commissions WHERE order_id = ?').get(order.id);
  return order;
}

function updateStatus(id, status) {
  const order = getOrder(id);
  if (!order) return { error: 'La orden no existe.' };
  if (!VALID_STATUS.includes(status)) return { error: 'Estado inválido.' };
  if (status === order.status) return { order };

  db.transaction(() => {
    db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').run(status, nowLocal(), order.id);
    db.prepare('UPDATE commissions SET status = ? WHERE order_id = ?').run(COMMISSION_STATUS[status], order.id);
  })();

  return { order: getOrder(id) };
}

function deleteOrder(id) {
  const order = getOrder(id);
  if (!order) return { error: 'La orden no existe.' };

  db.transaction(() => {
    const restore = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
    for (const it of order.items) {
      if (it.product_id) restore.run(it.quantity, it.product_id);
    }
    db.prepare('DELETE FROM orders WHERE id = ?').run(order.id);
  })();

  return { ok: true };
}

module.exports = { createOrder, getOrder, updateStatus, deleteOrder, VALID_STATUS };
