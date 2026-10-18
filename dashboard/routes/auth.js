const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { verifyCsrf } = require('../middleware/csrf');

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', { title: 'Iniciar sesión' });
});

router.post('/login', verifyCsrf, (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).render('login', { title: 'Iniciar sesión', error: 'Usuario o contraseña incorrectos.' });
  }

  req.session.regenerate((err) => {
    if (err) {
      return res.status(500).render('error', { title: 'Error', message: 'No se pudo iniciar la sesión.' });
    }
    req.session.user = {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      commissionPct: user.commission_pct
    };
    res.locals.currentUser = req.session.user;
    req.session.save(() => res.redirect('/'));
  });
});

router.post('/logout', verifyCsrf, (req, res) => {
  req.session.destroy(() => res.redirect('/auth/login'));
});

module.exports = router;
