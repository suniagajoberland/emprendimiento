const axios = require('axios');
const db = require('../db/database');
const { todayLocal, nowLocal } = require('../utils/datetime');

const SOURCES = [
  {
    name: 'bcv.today',
    url: 'https://bcv.today/api/v1/rate.json',
    parse(data) {
      return { rate: Number(data.USD), date: data.effective_date || data.date };
    }
  },
  {
    name: 've.dolarapi.com',
    url: 'https://ve.dolarapi.com/v1/dolares/oficial',
    parse(data) {
      return { rate: Number(data.promedio), date: String(data.fechaActualizacion || '').slice(0, 10) };
    }
  }
];

async function fetchLatestRate() {
  for (const source of SOURCES) {
    try {
      const { data } = await axios.get(source.url, { timeout: 8000 });
      const parsed = source.parse(data);
      if (parsed && Number.isFinite(parsed.rate) && parsed.rate > 0) {
        return { rate: parsed.rate, date: parsed.date || todayLocal(), source: source.name };
      }
    } catch {}
  }
  return null;
}

function upsertRate(date, rate, source) {
  db.prepare(
    `INSERT INTO exchange_rates (rate_date, rate_bs, source, fetched_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(rate_date) DO UPDATE SET rate_bs = excluded.rate_bs, source = excluded.source, fetched_at = excluded.fetched_at`
  ).run(date, rate, source, nowLocal());
  return getRateByDate(date);
}

function getLatestRate() {
  return db.prepare('SELECT * FROM exchange_rates ORDER BY rate_date DESC, id DESC LIMIT 1').get() || null;
}

function getRateByDate(date) {
  return db.prepare('SELECT * FROM exchange_rates WHERE rate_date = ?').get(date) || null;
}

function getRateForDate(date) {
  return (
    db.prepare('SELECT * FROM exchange_rates WHERE rate_date <= ? ORDER BY rate_date DESC LIMIT 1').get(date) ||
    getLatestRate()
  );
}

function getHistory(limit = 90) {
  return db.prepare('SELECT * FROM exchange_rates ORDER BY rate_date DESC LIMIT ?').all(limit);
}

async function ensureTodayRate() {
  const today = todayLocal();
  const fetched = await fetchLatestRate();
  if (fetched) return upsertRate(fetched.date || today, fetched.rate, fetched.source);
  return getLatestRate();
}

module.exports = {
  fetchLatestRate,
  upsertRate,
  getLatestRate,
  getRateByDate,
  getRateForDate,
  getHistory,
  ensureTodayRate
};
