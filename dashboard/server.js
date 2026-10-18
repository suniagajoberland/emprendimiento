const path = require('path');
const express = require('express');
const session = require('express-session');

const config = require('./config');
require('./db/database');
const SQLiteStore = require('./utils/session-store');
const { attachUser } = require('./middleware/auth');
const { csrfToken } = require('./middleware/csrf');
const bcv = require('./services/bcv');
const { usd, bs, pct } = require('./utils/money');
const { fmtDateTime, fmtDate } = require('./utils/datetime');
const authRoutes = require('./routes/auth');
const mainRoutes = require('./routes');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.locals.usd = usd;
app.locals.bs = bs;
app.locals.pct = pct;
app.locals.fmtDateTime = fmtDateTime;
app.locals.fmtDate = fmtDate;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    store: new SQLiteStore(),
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: config.sessionMaxAgeMs }
  })
);

app.use((req, res, next) => {
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  res.locals.statusLabels = { pending: 'Pendiente', paid: 'Pagada', shipped: 'Enviada', cancelled: 'Cancelada' };
  next();
});

app.use(attachUser);
app.use(csrfToken);

app.use('/auth', authRoutes);
app.use('/', mainRoutes);

app.use((req, res) => {
  res.status(404).render('error', { title: 'No encontrado', message: 'La página solicitada no existe.' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { title: 'Error', message: 'Ocurrió un error inesperado en el servidor.' });
});

bcv.ensureTodayRate().catch(() => {});
setInterval(() => {
  bcv.ensureTodayRate().catch(() => {});
}, config.rateRefreshMs).unref();

app.listen(config.port, () => {
  console.log(`Avellvis Dashboard corriendo en http://localhost:${config.port}`);
});

module.exports = app;
