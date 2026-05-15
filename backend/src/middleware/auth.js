// const jwt = require('jsonwebtoken');
// const { db } = require('../db/database');

// function authenticate(req, res, next) {
//   const authHeader = req.headers['authorization'];
//   const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

//   if (!token) {
//     return res.status(401).json({ error: 'Authentication required' });
//   }

//   try {
//     const payload = jwt.verify(token, process.env.JWT_SECRET);
//     // Fetch fresh user from DB (so role/manager changes are picked up)
//     const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId);
//     if (!user) return res.status(401).json({ error: 'User not found' });
//     req.user = user;
//     next();
//   } catch (err) {
//     return res.status(401).json({ error: 'Invalid or expired token' });
//   }
// }

// module.exports = { authenticate };

const jwt = require('jsonwebtoken');
const { db } = require('../db/database');

function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];

  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(payload.userId);

    if (!user) {
      return res.status(401).json({
        error: 'User not found'
      });
    }

    req.user = user;

    next();

  } catch (err) {
    return res.status(401).json({
      error: 'Invalid or expired token'
    });
  }
}

module.exports = { authenticate };