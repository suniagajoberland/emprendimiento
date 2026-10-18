const config = require('../config');

const TZ = config.displayTz;

const dateTimeFmt = new Intl.DateTimeFormat('sv-SE', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
});

const dateFmt = new Intl.DateTimeFormat('sv-SE', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

function nowLocal(date = new Date()) {
  return dateTimeFmt.format(date);
}

function todayLocal(date = new Date()) {
  return dateFmt.format(date);
}

function daysAgo(n, time = '10:00:00') {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${todayLocal(d)} ${time}`;
}

function fmtDateTime(s) {
  if (!s) return '—';
  const [datePart, timePart = ''] = String(s).split(' ');
  const [y, m, d] = datePart.split('-');
  return `${d}/${m}/${y}${timePart ? ' ' + timePart.slice(0, 5) : ''}`;
}

function fmtDate(s) {
  if (!s) return '—';
  const [y, m, d] = String(s).split('-');
  return `${d}/${m}/${y}`;
}

module.exports = { nowLocal, todayLocal, daysAgo, fmtDateTime, fmtDate };
