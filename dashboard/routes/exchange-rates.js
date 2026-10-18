const express = require('express');
const bcv = require('../services/bcv');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('exchange-rates', {
    title: 'Tasas BCV',
    current: bcv.getLatestRate(),
    history: bcv.getHistory(90)
  });
});

router.post('/refresh', requireAdmin, async (req, res) => {
  const fetched = await bcv.fetchLatestRate();
  if (!fetched) {
    req.session.flash = { type: 'error', text: 'No se pudo obtener la tasa de ninguna fuente (bcv.today, ve.dolarapi.com).' };
    return res.redirect('/exchange-rates');
  }
  bcv.upsertRate(fetched.date, fetched.rate, fetched.source);
  req.session.flash = {
    type: 'success',
    text: `Tasa registrada: ${fetched.date} · Bs ${fetched.rate} (${fetched.source}).`
  };
  res.redirect('/exchange-rates');
});

router.post('/', requireAdmin, (req, res) => {
  const date = String(req.body.rate_date || '').trim();
  const rate = parseFloat(req.body.rate_bs);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !(rate > 0)) {
    req.session.flash = { type: 'error', text: 'Fecha o tasa inválidas.' };
    return res.redirect('/exchange-rates');
  }
  bcv.upsertRate(date, rate, 'manual');
  req.session.flash = { type: 'success', text: `Tasa ${date} guardada manualmente.` };
  res.redirect('/exchange-rates');
});

module.exports = router;
