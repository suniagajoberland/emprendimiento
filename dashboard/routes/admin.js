const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');

const router = express.Router();

router.get('/users', (req, res) => {
  const users = db.prepare('SELECT * FROM users ORDER BY role, full_name').all();
  res.render('admin/users', { title: 'Usuarios y asesores', users });
});

router.get('/users/new', (req, res) => {
  res.render('admin/user-form', { title: 'Nuevo usuario', user: null });
});

router.post('/users', (req, res) => {
  const username = String(req.body.username || '').trim();
  const fullName = String(req.body.full_name || '').trim();
  const password = String(req.body.password || '');
  const role = req.body.role === 'admin' ? 'admin' : 'advisor';
  const commissionPct = parseFloat(req.body.commission_pct);
  const active = req.body.active ? 1 : 0;

  if (!username || !fullName || !password) {
    req.session.flash = { type: 'error', text: 'Usuario, nombre y contraseña son obligatorios.' };
    return res.redirect('/admin/users/new');
  }
  if (password.length < 6) {
    req.session.flash = { type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' };
    return res.redirect('/admin/users/new');
  }

  try {
    db.prepare(
      `INSERT INTO users (username, password_hash, full_name, role, commission_pct, active, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now','localtime'))`
    ).run(username, bcrypt.hashSync(password, 10), fullName, role, Number.isFinite(commissionPct) && commissionPct >= 0 ? commissionPct : 0, active);
    req.session.flash = { type: 'success', text: 'Usuario creado.' };
    res.redirect('/admin/users');
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      req.session.flash = { type: 'error', text: 'Ese nombre de usuario ya existe.' };
      return res.redirect('/admin/users/new');
    }
    throw err;
  }
});

router.get('/users/:id/edit', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).render('error', { title: 'No encontrado', message: 'El usuario no existe.' });
  res.render('admin/user-form', { title: 'Editar usuario', user });
});

router.post('/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).render('error', { title: 'No encontrado', message: 'El usuario no existe.' });

  const username = String(req.body.username || '').trim();
  const fullName = String(req.body.full_name || '').trim();
  const password = String(req.body.password || '');
  const role = req.body.role === 'admin' ? 'admin' : 'advisor';
  const commissionPct = parseFloat(req.body.commission_pct);
  const active = req.body.active ? 1 : 0;

  if (!username || !fullName) {
    req.session.flash = { type: 'error', text: 'Usuario y nombre son obligatorios.' };
    return res.redirect(`/admin/users/${user.id}/edit`);
  }
  if (password && password.length < 6) {
    req.session.flash = { type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' };
    return res.redirect(`/admin/users/${user.id}/edit`);
  }

  try {
    if (password) {
      db.prepare(
        'UPDATE users SET username = ?, full_name = ?, password_hash = ?, role = ?, commission_pct = ?, active = ? WHERE id = ?'
      ).run(username, fullName, bcrypt.hashSync(password, 10), role, Number.isFinite(commissionPct) && commissionPct >= 0 ? commissionPct : 0, active, user.id);
    } else {
      db.prepare(
        'UPDATE users SET username = ?, full_name = ?, role = ?, commission_pct = ?, active = ? WHERE id = ?'
      ).run(username, fullName, role, Number.isFinite(commissionPct) && commissionPct >= 0 ? commissionPct : 0, active, user.id);
    }
    req.session.flash = { type: 'success', text: 'Usuario actualizado. Las nuevas comisiones aplican a órdenes futuras.' };
    res.redirect('/admin/users');
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      req.session.flash = { type: 'error', text: 'Ese nombre de usuario ya existe.' };
      return res.redirect(`/admin/users/${user.id}/edit`);
    }
    throw err;
  }
});

router.post('/users/:id/delete', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (user) {
    if (user.id === req.session.user.id) {
      req.session.flash = { type: 'error', text: 'No puedes eliminar tu propia cuenta.' };
      return res.redirect('/admin/users');
    }
    const related = db.prepare('SELECT COUNT(*) AS n FROM orders WHERE user_id = ?').get(user.id).n;
    if (related > 0) {
      req.session.flash = { type: 'error', text: 'El usuario tiene órdenes registradas. Desactívalo en lugar de eliminarlo.' };
      return res.redirect('/admin/users');
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
    req.session.flash = { type: 'success', text: 'Usuario eliminado.' };
  }
  res.redirect('/admin/users');
});

module.exports = router;
