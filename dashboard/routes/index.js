const express = require('express');
const db = require('../db/database');
const bcv = require('../services/bcv');
const { requireLogin, requireAdmin } = require('../middleware/auth');
const { verifyCsrf } = require('../middleware/csrf');
const { todayLocal } = require('../utils/datetime');

const ordersRoutes = require('./orders');
const productsRoutes = require('./products');
const categoriesRoutes = require('./categories');
const adminRoutes = require('./admin');
const reportsRoutes = require('./reports');
const exchangeRoutes = require('./exchange-rates');

const router = express.Router();

router.use(requireLogin);
router.use((req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') return next();
  return verifyCsrf(req, res, next);
});

router.get('/', (req, res) => {
  const user = req.session.user;
  const isAdmin = user.role === 'admin';
  const month = todayLocal().slice(0, 7);

  const monthParams = [month];
  let monthScope = '';
  if (!isAdmin) {
    monthScope = ' AND user_id = ?';
    monthParams.push(user.id);
  }
  const ordersMonth = db
    .prepare(
      `SELECT COUNT(*) AS count, COALESCE(SUM(total_usd), 0) AS total_usd, COALESCE(SUM(total_bs), 0) AS total_bs
       FROM orders WHERE substr(created_at, 1, 7) = ?${monthScope}`
    )
    .get(...monthParams);

  const commissionsMonth = db
    .prepare(
      `SELECT COALESCE(SUM(c.amount_usd), 0) AS amount_usd, COALESCE(SUM(c.amount_bs), 0) AS amount_bs
       FROM commissions c JOIN orders o ON o.id = c.order_id
       WHERE substr(o.created_at, 1, 7) = ?${isAdmin ? '' : ' AND c.advisor_id = ?'}`
    )
    .get(...(isAdmin ? [month] : [month, user.id]));

  const pending = db
    .prepare(`SELECT COUNT(*) AS count FROM orders WHERE status = 'pending'${isAdmin ? '' : ' AND user_id = ?'}`)
    .get(...(isAdmin ? [] : [user.id]));

  const latest = db
    .prepare(
      `SELECT o.*, u.full_name AS advisor_name FROM orders o JOIN users u ON u.id = o.user_id
       ${isAdmin ? '' : 'WHERE o.user_id = ?'} ORDER BY o.created_at DESC LIMIT 8`
    )
    .all(...(isAdmin ? [] : [user.id]));

  res.render('dashboard', { title: 'Inicio', rate: bcv.getLatestRate(), ordersMonth, commissionsMonth, pending, latest });
});

router.get('/api/products', (req, res) => {
  res.json(db.prepare('SELECT id, name, sku, price_usd, stock FROM products WHERE active = 1 ORDER BY name').all());
});

router.get('/api/rates/current', (req, res) => {
  res.json(bcv.getLatestRate() || null);
});

router.use('/orders', ordersRoutes);
router.use('/products', productsRoutes);
router.use('/categories', requireAdmin, categoriesRoutes);
router.use('/admin', requireAdmin, adminRoutes);
router.use('/reports', reportsRoutes);
router.use('/exchange-rates', exchangeRoutes);

module.exports = router;
