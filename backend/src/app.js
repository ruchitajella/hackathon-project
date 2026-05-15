// require('dotenv').config();
// const express = require('express');
// const cors    = require('cors');

// const authRoutes         = require('./routes/auth');
// const leavesRoutes       = require('./routes/leaves');
// const managerRoutes      = require('./routes/manager');
// const availabilityRoutes = require('./routes/availability');

// const app  = express();
// const PORT = process.env.PORT || 5000;

// app.use(cors());
// app.use(express.json());

// // ─── Routes ──────────────────────────────────────────────────────
// app.use('/api/auth',         authRoutes);
// app.use('/api/leaves',       leavesRoutes);
// app.use('/api/manager',      managerRoutes);
// app.use('/api/availability', availabilityRoutes);

// // ─── Health check ─────────────────────────────────────────────────
// app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// // ─── Global error handler ─────────────────────────────────────────
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).json({ error: 'Internal server error' });
// });

// app.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });
console.log("APP STARTED");
require('dotenv').config();

console.log('1. dotenv loaded');

const express = require('express');
console.log('2. express loaded');

const cors = require('cors');
console.log('3. cors loaded');

const authRoutes = require('./routes/auth');
console.log('4. auth routes loaded');

const leavesRoutes = require('./routes/leaves');
console.log('5. leaves routes loaded');

const managerRoutes = require('./routes/manager');
console.log('6. manager routes loaded');

const availabilityRoutes = require('./routes/availability');
console.log('7. availability routes loaded');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
console.log('authRoutes:', typeof authRoutes);
console.log('leavesRoutes:', typeof leavesRoutes);
console.log('managerRoutes:', typeof managerRoutes);
console.log('availabilityRoutes:', typeof availabilityRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/leaves', leavesRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/availability', availabilityRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

console.log('8. before listen');

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});