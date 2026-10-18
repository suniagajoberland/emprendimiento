const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/', (req, res) => {
  const categories = db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
       FROM categories c ORDER BY c.name`
    )
    .all();
  res.render('categories', { title: 'Categorías', categories });
});

router.post('/', (req, res) => {
  const name = String(req.body.name || '').trim();
  const description = String(req.body.description || '').trim();
  if (!name) {
    req.session.flash = { type: 'error', text: 'El nombre de la categoría es obligatorio.' };
    return res.redirect('/categories');
  }
  try {
    db.prepare("INSERT INTO categories (name, description, created_at) VALUES (?, ?, datetime('now','localtime'))").run(name, description);
    req.session.flash = { type: 'success', text: 'Categoría creada.' };
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      req.session.flash = { type: 'error', text: 'Ya existe una categoría con ese nombre.' };
    } else {
      throw err;
    }
  }
  res.redirect('/categories');
});

router.post('/:id/update', (req, res) => {
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (category) {
    const name = String(req.body.name || '').trim();
    const description = String(req.body.description || '').trim();
    if (!name) {
      req.session.flash = { type: 'error', text: 'El nombre no puede estar vacío.' };
      return res.redirect('/categories');
    }
    try {
      db.prepare('UPDATE categories SET name = ?, description = ? WHERE id = ?').run(name, description, category.id);
      req.session.flash = { type: 'success', text: 'Categoría actualizada.' };
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) {
        req.session.flash = { type: 'error', text: 'Ya existe una categoría con ese nombre.' };
      } else {
        throw err;
      }
    }
  }
  res.redirect('/categories');
});

router.post('/:id/delete', (req, res) => {
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (category) {
    db.prepare('DELETE FROM categories WHERE id = ?').run(category.id);
    req.session.flash = { type: 'success', text: 'Categoría eliminada. Sus productos quedaron sin categoría.' };
  }
  res.redirect('/categories');
});

module.exports = router;
