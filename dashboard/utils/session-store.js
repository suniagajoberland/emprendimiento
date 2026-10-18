const session = require('express-session');
const db = require('../db/database');

class SQLiteStore extends session.Store {
  constructor(options = {}) {
    super();
    this.db = options.db || db;
    this.ttl = options.ttl || 1000 * 60 * 60 * 24 * 7;
  }

  get(sid, cb) {
    try {
      const row = this.db.prepare('SELECT sess, expired FROM sessions WHERE sid = ?').get(sid);
      if (!row || Number(row.expired) < Date.now()) return cb(null, null);
      cb(null, JSON.parse(row.sess));
    } catch (err) {
      cb(err);
    }
  }

  set(sid, sess, cb) {
    try {
      const maxAge = (sess.cookie && (sess.cookie.originalMaxAge || sess.cookie.maxAge)) || this.ttl;
      const expired = Date.now() + Number(maxAge);
      this.db
        .prepare(
          'INSERT INTO sessions (sid, sess, expired) VALUES (?, ?, ?) ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expired = excluded.expired'
        )
        .run(sid, JSON.stringify(sess), expired);
      cb(null);
    } catch (err) {
      cb(err);
    }
  }

  touch(sid, sess, cb) {
    this.set(sid, sess, cb);
  }

  destroy(sid, cb) {
    try {
      this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
      cb(null);
    } catch (err) {
      cb(err);
    }
  }
}

module.exports = SQLiteStore;
