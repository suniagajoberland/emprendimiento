const express = require('express');
const db = require('../db/database');
const reportsService = require('../services/reports');
const { sendCsv, esNumber } = require('../utils/csv');
const { todayLocal } = require('../utils/datetime');

const router = express.Router();

function getFilters(req) {
  const user = req.session.user;
  const isAdmin = user.role === 'admin';
  const defaultFrom = todayLocal().slice(0, 8) + '01';
  return {
    from: req.query.from || defaultFrom,
    to: req.query.to || todayLocal(),
    advisorId: isAdmin ? req.query.advisor_id || '' : String(user.id)
  };
}

function advisorList(req) {
  return req.session.user.role === 'admin'
    ? db.prepare('SELECT id, full_name FROM users ORDER BY full_name').all()
    : [];
}

router.get('/sales', (req, res) => {
  const filters = getFilters(req);
  const data = reportsService.sales(filters);
  res.render('reports/sales', { title: 'Reporte de ventas', data, filters, advisors: advisorList(req) });
});

router.get('/sales.csv', (req, res) => {
  const filters = getFilters(req);
  const { rows } = reportsService.sales(filters);
  sendCsv(
    res,
    `ventas-${filters.from || 'inicio'}-${filters.to || 'hoy'}.csv`,
    [
      { id: 'orden', title: 'Orden' },
      { id: 'fecha', title: 'Fecha' },
      { id: 'asesor', title: 'Asesor' },
      { id: 'cliente', title: 'Cliente' },
      { id: 'estado', title: 'Estado' },
      { id: 'total_usd', title: 'Total USD' },
      { id: 'total_bs', title: 'Total Bs' },
      { id: 'comision_pct', title: 'Comision %' }
    ],
    rows.map((r) => ({
      orden: r.order_number,
      fecha: r.created_at,
      asesor: r.advisor_name,
      cliente: r.customer_name,
      estado: r.status,
      total_usd: esNumber(r.total_usd),
      total_bs: esNumber(r.total_bs),
      comision_pct: esNumber(r.commission_pct)
    }))
  );
});

router.get('/commissions', (req, res) => {
  const filters = getFilters(req);
  const data = reportsService.commissions(filters);
  res.render('reports/commissions', { title: 'Reporte de comisiones', data, filters, advisors: advisorList(req) });
});

router.get('/commissions.csv', (req, res) => {
  const filters = getFilters(req);
  const { rows } = reportsService.commissions(filters);
  sendCsv(
    res,
    `comisiones-${filters.from || 'inicio'}-${filters.to || 'hoy'}.csv`,
    [
      { id: 'orden', title: 'Orden' },
      { id: 'fecha', title: 'Fecha' },
      { id: 'asesor', title: 'Asesor' },
      { id: 'cliente', title: 'Cliente' },
      { id: 'pct', title: 'Comision %' },
      { id: 'base_usd', title: 'Base USD' },
      { id: 'monto_usd', title: 'Comision USD' },
      { id: 'monto_bs', title: 'Comision Bs' },
      { id: 'estado', title: 'Estado' }
    ],
    rows.map((r) => ({
      orden: r.order_number,
      fecha: r.created_at,
      asesor: r.advisor_name,
      cliente: r.customer_name,
      pct: esNumber(r.rate_pct),
      base_usd: esNumber(r.base_usd),
      monto_usd: esNumber(r.amount_usd),
      monto_bs: esNumber(r.amount_bs),
      estado: r.status
    }))
  );
});

module.exports = router;
