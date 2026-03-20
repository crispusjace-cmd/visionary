// ──────────────────────────────────────────────────────────────
//  MARKS   /api/marks
// ──────────────────────────────────────────────────────────────
const marksRouter = require('express').Router();
const pool        = require('../../config/db');
const { auth, allow } = require('../middleware/auth');

// GET /api/marks?student_id=&term=&year=
marksRouter.get('/', auth, async (req, res) => {
  const { student_id, term, year } = req.query;
  try {
    // Students can only see their own marks
    let sid = student_id;
    if (req.user.role === 'student') {
      const me = await pool.query('SELECT id FROM students WHERE user_id=$1', [req.user.id]);
      sid = me.rows[0]?.id;
    }

    const { rows } = await pool.query(`
      SELECT m.*, sub.name AS subject_name, sub.code,
             s.full_name AS student_name, s.roll_number
      FROM marks m
      JOIN subjects sub ON m.subject_id = sub.id
      JOIN students s   ON m.student_id  = s.id
      WHERE ($1::int IS NULL OR m.student_id = $1)
        AND ($2::int IS NULL OR m.term = $2)
        AND ($3::int IS NULL OR m.year = $3)
      ORDER BY s.roll_number, sub.name
    `, [sid||null, term||null, year||null]);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching marks.' });
  }
});

// POST /api/marks  — Teacher or Admin
marksRouter.post('/', auth, allow('admin','teacher'), async (req, res) => {
  const { entries } = req.body; // array of { student_id, subject_id, term, year, score }
  if (!Array.isArray(entries) || !entries.length)
    return res.status(400).json({ message: 'Provide an array of mark entries.' });

  try {
    // get teacher profile id
    let teacherId = null;
    if (req.user.role === 'teacher') {
      const t = await pool.query('SELECT id FROM teachers WHERE user_id=$1', [req.user.id]);
      teacherId = t.rows[0]?.id;
    }

    const saved = [];
    for (const e of entries) {
      const { rows } = await pool.query(`
        INSERT INTO marks (student_id, subject_id, term, year, score, submitted_by)
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT (student_id, subject_id, term, year)
        DO UPDATE SET score=$5, submitted_by=$6, submitted_at=NOW()
        RETURNING *
      `, [e.student_id, e.subject_id, e.term, e.year, e.score, teacherId]);
      saved.push(rows[0]);
    }
    res.status(201).json({ message: `${saved.length} mark(s) saved.`, data: saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error saving marks.' });
  }
});

// ──────────────────────────────────────────────────────────────
//  ATTENDANCE   /api/attendance
// ──────────────────────────────────────────────────────────────
const attRouter = require('express').Router();

// GET /api/attendance?student_id=&date=&class_id=
attRouter.get('/', auth, async (req, res) => {
  const { student_id, date, class_id } = req.query;
  try {
    let sid = student_id;
    if (req.user.role === 'student') {
      const me = await pool.query('SELECT id FROM students WHERE user_id=$1', [req.user.id]);
      sid = me.rows[0]?.id;
    }

    const { rows } = await pool.query(`
      SELECT a.*, s.full_name, s.roll_number, c.name AS class_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN classes  c ON s.class_id   = c.id
      WHERE ($1::int  IS NULL OR a.student_id = $1)
        AND ($2::date IS NULL OR a.date = $2)
        AND ($3::int  IS NULL OR s.class_id = $3)
      ORDER BY a.date DESC, s.roll_number
    `, [sid||null, date||null, class_id||null]);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching attendance.' });
  }
});

// POST /api/attendance  — Teacher or Admin submits a batch
attRouter.post('/', auth, allow('admin','teacher'), async (req, res) => {
  const { records } = req.body; // [{ student_id, date, status }]
  if (!Array.isArray(records) || !records.length)
    return res.status(400).json({ message: 'Provide an array of attendance records.' });

  try {
    let teacherId = null;
    if (req.user.role === 'teacher') {
      const t = await pool.query('SELECT id FROM teachers WHERE user_id=$1', [req.user.id]);
      teacherId = t.rows[0]?.id;
    }

    for (const r of records) {
      await pool.query(`
        INSERT INTO attendance (student_id, date, status, marked_by)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (student_id, date)
        DO UPDATE SET status=$3, marked_by=$4
      `, [r.student_id, r.date, r.status, teacherId]);
    }

    res.status(201).json({ message: `${records.length} attendance record(s) saved.` });
  } catch (err) {
    res.status(500).json({ message: 'Error saving attendance.' });
  }
});

// ──────────────────────────────────────────────────────────────
//  FEES   /api/fees
// ──────────────────────────────────────────────────────────────
const feesRouter = require('express').Router();

// GET /api/fees?student_id=&term=&year=
feesRouter.get('/', auth, async (req, res) => {
  const { student_id, term, year } = req.query;
  try {
    let sid = student_id;
    if (req.user.role === 'student') {
      const me = await pool.query('SELECT id FROM students WHERE user_id=$1', [req.user.id]);
      sid = me.rows[0]?.id;
    }

    const { rows } = await pool.query(`
      SELECT f.*, s.full_name, s.roll_number, c.name AS class_name,
             (f.amount_due - f.amount_paid) AS balance,
             CASE
               WHEN f.amount_paid >= f.amount_due THEN 'Paid'
               WHEN f.amount_paid > 0             THEN 'Partial'
               ELSE 'Unpaid'
             END AS status
      FROM fees f
      JOIN students s ON f.student_id = s.id
      JOIN classes  c ON s.class_id   = c.id
      WHERE ($1::int IS NULL OR f.student_id = $1)
        AND ($2::int IS NULL OR f.term = $2)
        AND ($3::int IS NULL OR f.year = $3)
      ORDER BY c.name, s.roll_number
    `, [sid||null, term||null, year||null]);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching fees.' });
  }
});

// POST /api/fees/payment  — Admin records a payment
feesRouter.post('/payment', auth, allow('admin'), async (req, res) => {
  const { student_id, term, year, amount_paid, payment_mode } = req.body;
  try {
    const { rows } = await pool.query(`
      UPDATE fees
      SET amount_paid  = amount_paid + $1,
          payment_mode = $2,
          payment_date = NOW(),
          recorded_by  = $3
      WHERE student_id=$4 AND term=$5 AND year=$6
      RETURNING *
    `, [amount_paid, payment_mode, req.user.id, student_id, term, year]);

    if (!rows[0]) return res.status(404).json({ message: 'Fee record not found.' });
    res.json({ message: 'Payment recorded.', data: rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Error recording payment.' });
  }
});

// ──────────────────────────────────────────────────────────────
//  NOTICES   /api/notices
// ──────────────────────────────────────────────────────────────
const noticesRouter = require('express').Router();

// GET /api/notices
noticesRouter.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT n.*, u.email AS posted_by_email
      FROM notices n
      LEFT JOIN users u ON n.posted_by = u.id
      ORDER BY n.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching notices.' });
  }
});

// POST /api/notices  — Admin only
noticesRouter.post('/', auth, allow('admin'), async (req, res) => {
  const { title, body, audience } = req.body;
  if (!title || !body) return res.status(400).json({ message: 'Title and body required.' });
  try {
    const { rows } = await pool.query(`
      INSERT INTO notices (title, body, audience, posted_by)
      VALUES ($1,$2,$3,$4) RETURNING *
    `, [title, body, audience||'all', req.user.id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error posting notice.' });
  }
});

// DELETE /api/notices/:id  — Admin only
noticesRouter.delete('/:id', auth, allow('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM notices WHERE id=$1', [req.params.id]);
    res.json({ message: 'Notice deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting notice.' });
  }
});

// ──────────────────────────────────────────────────────────────
//  TEACHERS   /api/teachers
// ──────────────────────────────────────────────────────────────
const teachersRouter = require('express').Router();

teachersRouter.get('/', auth, allow('admin'), async (req, res) => {
  const { rows } = await pool.query(`
    SELECT t.*, u.email, c.name AS class_name
    FROM teachers t
    LEFT JOIN users   u ON t.user_id  = u.id
    LEFT JOIN classes c ON t.class_id = c.id
    ORDER BY t.full_name
  `);
  res.json(rows);
});

teachersRouter.post('/', auth, allow('admin'), async (req, res) => {
  const { full_name, phone, subject, class_id, email, password } = req.body;
  if (!full_name || !email || !password)
    return res.status(400).json({ message: 'Name, email and password required.' });

  const client2 = await pool.connect();
  try {
    await client2.query('BEGIN');
    const hash = require('bcryptjs').hashSync(password, 10);
    const userRes = await client2.query(
      `INSERT INTO users (email, password, role) VALUES ($1,$2,'teacher') RETURNING id`,
      [email, hash]
    );
    const teacherRes = await client2.query(
      `INSERT INTO teachers (user_id, full_name, phone, subject, class_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [userRes.rows[0].id, full_name, phone||null, subject||null, class_id||null]
    );
    await client2.query('COMMIT');
    res.status(201).json(teacherRes.rows[0]);
  } catch (err) {
    await client2.query('ROLLBACK');
    if (err.code === '23505') return res.status(400).json({ message: 'Email already exists.' });
    res.status(500).json({ message: 'Error adding teacher.' });
  } finally {
    client2.release();
  }
});

teachersRouter.delete('/:id', auth, allow('admin'), async (req, res) => {
  await pool.query('DELETE FROM teachers WHERE id=$1', [req.params.id]);
  res.json({ message: 'Teacher removed.' });
});

// ──────────────────────────────────────────────────────────────
//  REPORTS   /api/reports  (Admin only)
// ──────────────────────────────────────────────────────────────
const reportsRouter = require('express').Router();

reportsRouter.get('/summary', auth, allow('admin'), async (req, res) => {
  try {
    const [students, teachers, passRate, feesCollected, feesDue] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM students WHERE status=$1', ['Active']),
      pool.query('SELECT COUNT(*) FROM teachers WHERE status=$1', ['Active']),
      pool.query(`
        SELECT ROUND(
          100.0 * COUNT(CASE WHEN avg_score >= 50 THEN 1 END) / NULLIF(COUNT(*),0), 1
        ) AS pass_rate
        FROM (
          SELECT student_id, AVG(score) AS avg_score
          FROM marks WHERE term=1 AND year=2026
          GROUP BY student_id
        ) sub
      `),
      pool.query('SELECT COALESCE(SUM(amount_paid),0) AS total FROM fees WHERE term=1 AND year=2026'),
      pool.query('SELECT COALESCE(SUM(amount_due),0)  AS total FROM fees WHERE term=1 AND year=2026'),
    ]);

    res.json({
      totalStudents:  parseInt(students.rows[0].count),
      totalTeachers:  parseInt(teachers.rows[0].count),
      passRate:       parseFloat(passRate.rows[0].pass_rate || 0),
      feesCollected:  parseInt(feesCollected.rows[0].total),
      feesDue:        parseInt(feesDue.rows[0].total),
    });
  } catch (err) {
    res.status(500).json({ message: 'Error building report.' });
  }
});

module.exports = { marksRouter, attRouter, feesRouter, noticesRouter, teachersRouter, reportsRouter };
