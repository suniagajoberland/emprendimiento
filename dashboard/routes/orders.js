const express = require('express');
const db = require('../db/database');
const bcv = require('../services/bcv');
const ordersService = require('../services/orders');
const { round2 } = require('../utils/money');

const router = express.Router();

router.get('/', (req, res) => {
  const user = req.session.user;
  const isAdmin = user.role === 'admin';
  const status = req.query.status || '';
  const advisorId = isAdmin ? req.query.advisor_id || '' : String(user.id);
  const from = req.query.from || '';
  const to = req.query.to || '';

  const where = [];
  const params = [];
  if (status) { where.push('o.status = ?'); params.push(status); }
  if (advisorId) { where.push('o.user_id = ?'); params.push(Number(advisorId)); }
  if (from) { where.push('date(o.created_at) >= ?'); params.push(from); }
  if (to) { where.push('date(o.created_at) <= ?'); params.push(to); }

  const orders = db
    .prepare(
      `SELECT o.*, u.full_name AS advisor_name FROM orders o JOIN users u ON u.id = o.user_id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY o.created_at DESC LIMIT 200`
    )
    .all(...params);

  const advisors = isAdmin
    ? db.prepare("SELECT id, full_name FROM users WHERE role = 'admin' OR role = 'advisor' ORDER BY full_name").all()
    : [];

  res.render('orders/list', { title: 'Órdenes', orders, advisors, filters: { status, advisorId, from, to } });
});

router.get('/new', (req, res) => {
  const products = db.prepare('SELECT id, name, sku, price_usd, stock FROM products WHERE active = 1 ORDER BY name').all();
  res.render('orders/new', { title: 'Nueva orden', products, rate: bcv.getLatestRate() });
});

router.post('/', (req, res) => {
  const user = req.session.user;
  const rawItems = Array.isArray(req.body.items) ? req.body.items : [];
  const items = rawItems
    .map((it) => ({
      productId: parseInt(it.product_id, 10),
      quantity: parseInt(it.quantity, 10),
      unitPriceUsd: round2(parseFloat(it.unit_price_usd))
    }))
    .filter((it) => Number.isInteger(it.productId) && it.productId > 0);

  const result = ordersService.createOrder({
    userId: user.id,
    commissionPct: user.commissionPct,
    customerName: String(req.body.customer_name || '').trim(),
    customerPhone: String(req.body.customer_phone || '').trim(),
    items,
    notes: String(req.body.notes || '').trim()
  });

  if (result.error) {
    req.session.flash = { type: 'error', text: result.error };
    return res.redirect('/orders/new');
  }

  req.session.flash = { type: 'success', text: `Orden ${result.order.order_number} creada correctamente.` };
  res.redirect(`/orders/${result.order.id}`);
});

router.get('/:id', (req, res) => {
  const order = ordersService.getOrder(req.params.id);
  if (!order) return res.status(404).render('error', { title: 'No encontrada', message: 'La orden no existe.' });
  if (req.session.user.role !== 'admin' && order.user_id !== req.session.user.id) {
    return res.status(403).render('error', { title: 'Acceso denegado', message: 'No puedes ver órdenes de otro asesor.' });
  }
  res.render('orders/show', { title: `Orden ${order.order_number}`, order });
});

router.post('/:id/status', (req, res) => {
  const result = ordersService.updateStatus(req.params.id, String(req.body.status || ''));
  req.session.flash = result.error
    ? { type: 'error', text: result.error }
    : { type: 'success', text: 'Estado de la orden actualizado.' };
  res.redirect(`/orders/${req.params.id}`);
});

router.post('/:id/delete', (req, res) => {
  const user = req.session.user;
  const order = ordersService.getOrder(req.params.id);
  if (!order) return res.status(404).render('error', { title: 'No encontrada', message: 'La orden no existe.' });
  if (user.role !== 'admin' && order.user_id !== user.id) {
    return res.status(403).render('error', { title: 'Acceso denegado', message: 'No puedes eliminar órdenes de otro asesor.' });
  }

  const result = ordersService.deleteOrder(order.id);
  req.session.flash = result.error
    ? { type: 'error', text: result.error }
    : { type: 'success', text: `Orden ${order.order_number} eliminada. Stock restaurado.` };
  res.redirect('/orders');
});

module.exports = router;
