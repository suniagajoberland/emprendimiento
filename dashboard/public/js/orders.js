document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('order-form');
  if (!form) return;

  const itemsEl = document.getElementById('items');
  const dataEl = document.getElementById('products-data');
  const addBtn = document.getElementById('add-item');
  const totalUsdEl = document.getElementById('total-usd');
  const totalBsEl = document.getElementById('total-bs');
  const rate = parseFloat(form.dataset.rate || '0');
  const products = JSON.parse(dataEl.textContent);

  const usdFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const bsFmt = new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  function productOptions(selectedId) {
    return products
      .map(
        (p) =>
          `<option value="${p.id}" data-price="${p.price_usd}" data-stock="${p.stock}" ${
            String(p.id) === String(selectedId) ? 'selected' : ''
          }>${p.name} (${usdFmt.format(p.price_usd)})</option>`
      )
      .join('');
  }

  function reindex() {
    const rows = itemsEl.querySelectorAll('.item-row');
    rows.forEach((row, i) => {
      row.querySelector('.item-product').name = `items[${i}][product_id]`;
      row.querySelector('.item-qty').name = `items[${i}][quantity]`;
      row.querySelector('.item-price').name = `items[${i}][unit_price_usd]`;
    });
  }

  function computeTotals() {
    let total = 0;
    itemsEl.querySelectorAll('.item-row').forEach((row) => {
      const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
      const price = parseFloat(row.querySelector('.item-price').value) || 0;
      const line = round2(qty * price);
      total += line;
      row.querySelector('.item-total').textContent = usdFmt.format(line);
    });
    total = round2(total);
    totalUsdEl.textContent = usdFmt.format(total);
    totalBsEl.textContent = 'Bs ' + bsFmt.format(round2(total * rate));
  }

  function addRow() {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <select class="item-product" required>${productOptions()}</select>
      <input type="number" class="item-qty" min="1" step="1" value="1" required />
      <input type="number" class="item-price" min="0" step="0.01" required />
      <span class="item-total">${usdFmt.format(0)}</span>
      <button type="button" class="btn btn-sm btn-danger btn-remove">Quitar</button>
    `;
    itemsEl.appendChild(row);

    const select = row.querySelector('.item-product');
    const qtyInput = row.querySelector('.item-qty');
    const priceInput = row.querySelector('.item-price');

    function syncFromProduct() {
      const opt = select.selectedOptions[0];
      if (!opt) return;
      priceInput.value = opt.dataset.price;
      qtyInput.max = opt.dataset.stock;
    }

    select.addEventListener('change', () => {
      syncFromProduct();
      computeTotals();
    });
    qtyInput.addEventListener('input', computeTotals);
    priceInput.addEventListener('input', computeTotals);
    row.querySelector('.btn-remove').addEventListener('click', () => {
      row.remove();
      reindex();
      computeTotals();
    });

    syncFromProduct();
    reindex();
    computeTotals();
  }

  addBtn.addEventListener('click', addRow);

  form.addEventListener('submit', function (e) {
    if (!itemsEl.querySelector('.item-row')) {
      e.preventDefault();
      alert('Agrega al menos un producto a la orden.');
    }
  });

  addRow();
});
