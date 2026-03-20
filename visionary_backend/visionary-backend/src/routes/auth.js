const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const pool    = require('../../config/db');
const { auth } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password are required.' });

  try {
    const { rows } = await pool.query(
      `SELECT u.*, 
        CASE 
          WHEN u.role = 'teacher' THEN t.full_name
          WHEN u.role = 'student' THEN s.full_name
          ELSE 'Admin User'
        END AS full_name,
        CASE
          WHEN u.role = 'teacher' THEN t.id
          WHEN u.role = 'student' THEN s.id
          ELSE NULL
        END AS profile_id
       FROM users u
       LEFT JOIN teachers t ON t.user_id = u.id
       LEFT JOIN students s ON s.user_id = u.id
       WHERE u.email = $1`,
      [email]
    );

    const user = rows[0];
    if (!user) return res.status(401).json({ message: 'Invalid email or password.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid email or password.' });

    const token = jwt.sign(
      { id: user.id, role: user.role, profileId: user.profile_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id:        user.id,
        email:     user.email,
        role:      user.role,
        fullName:  user.full_name,
        profileId: user.profile_id,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// GET /api/auth/me  — returns the current logged-in user
router.get('/me', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'User not found.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
