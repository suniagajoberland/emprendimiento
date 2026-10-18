const express = require('express');
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

function parseProduct(req) {
  const name = String(req.body.name || '').trim();
  const sku = String(req.body.sku || '').trim() || null;
  const priceUsd = parseFloat(req.body.price_usd);
  const stock = parseInt(req.body.stock, 10);
  const categoryId = parseInt(req.body.category_id, 10);
  const active = req.body.active ? 1 : 0;

  if (!name) return { error: 'El nombre del producto es obligatorio.' };
  if (!Number.isFinite(priceUsd) || priceUsd < 0) return { error: 'Precio USD inválido.' };
  if (!Number.isInteger(stock) || stock < 0) return { error: 'Stock inválido.' };

  return {
    data: {
      name,
      sku,
      price_usd: Math.round(priceUsd * 100) / 100,
      stock,
      category_id: Number.isInteger(categoryId) && categoryId > 0 ? categoryId : null,
      active
    }
  };
}

router.get('/', (req, res) => {
  const products = db
    .prepare(
      `SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id ORDER BY p.name`
    )
    .all();
  res.render('products/list', { title: 'Productos', products });
});

router.get('/new', requireAdmin, (req, res) => {
  const categories = db.prepare('SELECT id, name FROM categories ORDER BY name').all();
  res.render('products/form', { title: 'Nuevo producto', product: null, categories });
});

router.post('/', requireAdmin, (req, res) => {
  const parsed = parseProduct(req);
  if (parsed.error) {
    req.session.flash = { type: 'error', text: parsed.error };
    return res.redirect('/products/new');
  }
  try {
    db.prepare(
      `INSERT INTO products (category_id, name, sku, price_usd, stock, active, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now','localtime'))`
    ).run(parsed.data.category_id, parsed.data.name, parsed.data.sku, parsed.data.price_usd, parsed.data.stock, parsed.data.active);
    req.session.flash = { type: 'success', text: 'Producto creado.' };
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      req.session.flash = { type: 'error', text: 'Ya existe un producto con ese SKU.' };
    } else {
      throw err;
    }
  }
  res.redirect('/products');
});

router.get('/:id/edit', requireAdmin, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).render('error', { title: 'No encontrado', message: 'El producto no existe.' });
  const categories = db.prepare('SELECT id, name FROM categories ORDER BY name').all();
  res.render('products/form', { title: 'Editar producto', product, categories });
});

router.post('/:id', requireAdmin, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).render('error', { title: 'No encontrado', message: 'El producto no existe.' });

  const parsed = parseProduct(req);
  if (parsed.error) {
    req.session.flash = { type: 'error', text: parsed.error };
    return res.redirect(`/products/${product.id}/edit`);
  }
  try {
    db.prepare(
      'UPDATE products SET category_id = ?, name = ?, sku = ?, price_usd = ?, stock = ?, active = ? WHERE id = ?'
    ).run(parsed.data.category_id, parsed.data.name, parsed.data.sku, parsed.data.price_usd, parsed.data.stock, parsed.data.active, product.id);
    req.session.flash = { type: 'success', text: 'Producto actualizado.' };
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      req.session.flash = { type: 'error', text: 'Ya existe un producto con ese SKU.' };
    } else {
      throw err;
    }
  }
  res.redirect('/products');
});

router.post('/:id/delete', requireAdmin, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (product) {
    db.prepare('DELETE FROM products WHERE id = ?').run(product.id);
    req.session.flash = { type: 'success', text: 'Producto eliminado.' };
  }
  res.redirect('/products');
});

module.exports = router;
