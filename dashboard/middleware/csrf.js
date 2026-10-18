const crypto = require('crypto');

function csrfToken(req, res, next) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  res.locals.csrfToken = req.session.csrfToken;
  next();
}

function verifyCsrf(req, res, next) {
  const sent = req.body && req.body._csrf;
  if (!sent || sent !== req.session.csrfToken) {
    return res.status(403).render('error', {
      title: 'Token inválido',
      message: 'El token de seguridad expiró o es inválido. Recarga la página e inténtalo de nuevo.'
    });
  }
  next();
}

module.exports = { csrfToken, verifyCsrf };
