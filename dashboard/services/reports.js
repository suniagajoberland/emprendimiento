const db = require('../db/database');

function sales({ from, to, advisorId }) {
  const where = [];
  const params = [];
  if (from) { where.push('date(o.created_at) >= ?'); params.push(from); }
  if (to) { where.push('date(o.created_at) <= ?'); params.push(to); }
  if (advisorId) { where.push('o.user_id = ?'); params.push(advisorId); }
  const clause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const rows = db
    .prepare(
      `SELECT o.id, o.order_number, o.created_at, o.customer_name, o.status, o.total_usd, o.total_bs, o.commission_pct, u.full_name AS advisor_name
       FROM orders o JOIN users u ON u.id = o.user_id ${clause} ORDER BY o.created_at DESC`
    )
    .all(...params);

  const summary = db
    .prepare(
      `SELECT COUNT(*) AS orders, COALESCE(SUM(o.total_usd), 0) AS total_usd, COALESCE(SUM(o.total_bs), 0) AS total_bs
       FROM orders o ${clause}`
    )
    .get(...params);

  return { rows, summary };
}

function commissions({ from, to, advisorId }) {
  const where = [];
  const params = [];
  if (from) { where.push('date(o.created_at) >= ?'); params.push(from); }
  if (to) { where.push('date(o.created_at) <= ?'); params.push(to); }
  if (advisorId) { where.push('c.advisor_id = ?'); params.push(advisorId); }
  const clause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const summary = db
    .prepare(
      `SELECT u.id AS advisor_id, u.full_name AS advisor_name, u.commission_pct, COUNT(c.id) AS orders,
              COALESCE(SUM(c.base_usd), 0) AS base_usd, COALESCE(SUM(c.amount_usd), 0) AS amount_usd, COALESCE(SUM(c.amount_bs), 0) AS amount_bs
       FROM commissions c JOIN users u ON u.id = c.advisor_id JOIN orders o ON o.id = c.order_id ${clause}
       GROUP BY u.id, u.full_name, u.commission_pct ORDER BY amount_usd DESC`
    )
    .all(...params);

  const rows = db
    .prepare(
      `SELECT c.*, o.order_number, o.created_at, o.customer_name, o.status AS order_status, u.full_name AS advisor_name
       FROM commissions c JOIN orders o ON o.id = c.order_id JOIN users u ON u.id = c.advisor_id ${clause}
       ORDER BY o.created_at DESC`
    )
    .all(...params);

  const totals = {
    amount_usd: rows.reduce((s, r) => s + r.amount_usd, 0),
    amount_bs: rows.reduce((s, r) => s + r.amount_bs, 0)
  };

  return { summary, rows, totals };
}

module.exports = { sales, commissions };
