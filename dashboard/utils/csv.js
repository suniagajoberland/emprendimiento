const { createObjectCsvStringifier } = require('csv-writer');

function esNumber(value, decimals = 2) {
  return String(Number(value || 0).toFixed(decimals)).replace('.', ',');
}

function sendCsv(res, filename, header, records) {
  const stringifier = createObjectCsvStringifier({ header, fieldDelimiter: ';' });
  const csv = '﻿' + stringifier.getHeaderString() + stringifier.stringifyRecords(records);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

module.exports = { sendCsv, esNumber };
