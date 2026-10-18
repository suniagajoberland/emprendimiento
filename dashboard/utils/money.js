function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

const usdFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const bsFmt = new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function usd(n) {
  return usdFmt.format(Number(n) || 0);
}

function bs(n) {
  return 'Bs ' + bsFmt.format(Number(n) || 0);
}

function pct(n) {
  return `${Number(n) || 0} %`;
}

module.exports = { round2, usd, bs, pct };
