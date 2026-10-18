function attachUser(req, res, next) {
  res.locals.currentUser = req.session.user || null;
  next();
}

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/auth/login');
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) return res.redirect('/auth/login');
  if (req.session.user.role !== 'admin') {
    return res.status(403).render('error', { title: 'Acceso denegado', message: 'Se requiere rol de administrador.' });
  }
  next();
}

module.exports = { attachUser, requireLogin, requireAdmin };
