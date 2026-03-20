const router = require('express').Router();
const pool   = require('../../config/db');
const { auth, allow } = require('../middleware/auth');

// GET /api/students  — Admin: all students | Teacher: own class | Student: own record
router.get('/', auth, async (req, res) => {
  try {
    let query, params = [];

    if (req.user.role === 'admin') {
      query = `
        SELECT s.*, c.name AS class_name, c.grade
        FROM students s
        LEFT JOIN classes c ON s.class_id = c.id
        ORDER BY c.name, s.roll_number
      `;
    } else if (req.user.role === 'teacher') {
      // Teacher only sees their assigned class
      query = `
        SELECT s.*, c.name AS class_name, c.grade
        FROM students s
        JOIN classes c ON s.class_id = c.id
        JOIN teachers t ON t.class_id = c.id AND t.user_id = $1
        ORDER BY s.roll_number
      `;
      params = [req.user.id];
    } else {
      // Student sees only themselves
      query = `
        SELECT s.*, c.name AS class_name, c.grade
        FROM students s
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE s.user_id = $1
      `;
      params = [req.user.id];
    }

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching students.' });
  }
});

// GET /api/students/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.*, c.name AS class_name, c.grade, c.term_fee,
             u.email
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = $1
    `, [req.params.id]);

    if (!rows[0]) return res.status(404).json({ message: 'Student not found.' });

    // Students can only see their own record
    if (req.user.role === 'student') {
      const me = await pool.query(`SELECT id FROM students WHERE user_id=$1`, [req.user.id]);
      if (!me.rows[0] || me.rows[0].id !== parseInt(req.params.id)) {
        return res.status(403).json({ message: 'Access denied.' });
      }
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching student.' });
  }
});

// POST /api/students  — Admin only
router.post('/', auth, allow('admin'), async (req, res) => {
  const { full_name, roll_number, class_id, dob, gender,
          guardian_name, guardian_phone, guardian_email, address } = req.body;

  if (!full_name || !roll_number || !class_id)
    return res.status(400).json({ message: 'Name, roll number and class are required.' });

  try {
    const { rows } = await pool.query(`
      INSERT INTO students
        (full_name, roll_number, class_id, dob, gender,
         guardian_name, guardian_phone, guardian_email, address)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [full_name, roll_number, class_id, dob||null, gender||null,
        guardian_name||null, guardian_phone||null, guardian_email||null, address||null]);

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'Roll number already exists.' });
    res.status(500).json({ message: 'Error adding student.' });
  }
});

// PUT /api/students/:id  — Admin only
router.put('/:id', auth, allow('admin'), async (req, res) => {
  const { full_name, class_id, dob, gender, guardian_name,
          guardian_phone, guardian_email, address, status } = req.body;
  try {
    const { rows } = await pool.query(`
      UPDATE students SET
        full_name     = COALESCE($1, full_name),
        class_id      = COALESCE($2, class_id),
        dob           = COALESCE($3, dob),
        gender        = COALESCE($4, gender),
        guardian_name = COALESCE($5, guardian_name),
        guardian_phone= COALESCE($6, guardian_phone),
        guardian_email= COALESCE($7, guardian_email),
        address       = COALESCE($8, address),
        status        = COALESCE($9, status)
      WHERE id = $10 RETURNING *
    `, [full_name, class_id, dob, gender, guardian_name,
        guardian_phone, guardian_email, address, status, req.params.id]);

    if (!rows[0]) return res.status(404).json({ message: 'Student not found.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error updating student.' });
  }
});

// DELETE /api/students/:id  — Admin only
router.delete('/:id', auth, allow('admin'), async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM students WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ message: 'Student not found.' });
    res.json({ message: 'Student deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting student.' });
  }
});

module.exports = router;
