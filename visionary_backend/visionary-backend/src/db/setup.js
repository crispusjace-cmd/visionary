// run with:  node src/db/setup.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const pool = require('../../config/db');

async function setup() {
  const client = await pool.connect();
  try {
    console.log('🔧  Setting up database tables...\n');

    await client.query(`
      -- USERS (login accounts for all roles)
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL PRIMARY KEY,
        email       VARCHAR(150) UNIQUE NOT NULL,
        password    VARCHAR(255) NOT NULL,
        role        VARCHAR(20) NOT NULL CHECK (role IN ('admin','teacher','student')),
        created_at  TIMESTAMP DEFAULT NOW()
      );

      -- CLASSES
      CREATE TABLE IF NOT EXISTS classes (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(20) UNIQUE NOT NULL,   -- e.g. "P7A"
        grade       VARCHAR(10) NOT NULL,           -- e.g. "P7"
        stream      VARCHAR(5),                     -- e.g. "A"
        term_fee    INTEGER NOT NULL DEFAULT 450000
      );

      -- TEACHERS
      CREATE TABLE IF NOT EXISTS teachers (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
        full_name   VARCHAR(150) NOT NULL,
        phone       VARCHAR(30),
        subject     VARCHAR(100),
        class_id    INTEGER REFERENCES classes(id),
        status      VARCHAR(20) DEFAULT 'Active',
        created_at  TIMESTAMP DEFAULT NOW()
      );

      -- STUDENTS
      CREATE TABLE IF NOT EXISTS students (
        id            SERIAL PRIMARY KEY,
        user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
        full_name     VARCHAR(150) NOT NULL,
        roll_number   VARCHAR(20) UNIQUE NOT NULL,
        class_id      INTEGER REFERENCES classes(id),
        dob           DATE,
        gender        VARCHAR(10),
        guardian_name VARCHAR(150),
        guardian_phone VARCHAR(30),
        guardian_email VARCHAR(150),
        address       TEXT,
        status        VARCHAR(20) DEFAULT 'Active',
        created_at    TIMESTAMP DEFAULT NOW()
      );

      -- SUBJECTS
      CREATE TABLE IF NOT EXISTS subjects (
        id    SERIAL PRIMARY KEY,
        name  VARCHAR(100) UNIQUE NOT NULL,
        code  VARCHAR(20) UNIQUE NOT NULL
      );

      -- MARKS
      CREATE TABLE IF NOT EXISTS marks (
        id          SERIAL PRIMARY KEY,
        student_id  INTEGER REFERENCES students(id) ON DELETE CASCADE,
        subject_id  INTEGER REFERENCES subjects(id),
        term        INTEGER NOT NULL CHECK (term IN (1,2,3)),
        year        INTEGER NOT NULL,
        score       NUMERIC(5,2) CHECK (score >= 0 AND score <= 100),
        submitted_by INTEGER REFERENCES teachers(id),
        submitted_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(student_id, subject_id, term, year)
      );

      -- ATTENDANCE
      CREATE TABLE IF NOT EXISTS attendance (
        id          SERIAL PRIMARY KEY,
        student_id  INTEGER REFERENCES students(id) ON DELETE CASCADE,
        date        DATE NOT NULL,
        status      VARCHAR(20) NOT NULL CHECK (status IN ('Present','Absent','Late')),
        marked_by   INTEGER REFERENCES teachers(id),
        created_at  TIMESTAMP DEFAULT NOW(),
        UNIQUE(student_id, date)
      );

      -- FEES
      CREATE TABLE IF NOT EXISTS fees (
        id          SERIAL PRIMARY KEY,
        student_id  INTEGER REFERENCES students(id) ON DELETE CASCADE,
        term        INTEGER NOT NULL CHECK (term IN (1,2,3)),
        year        INTEGER NOT NULL,
        amount_due  INTEGER NOT NULL,
        amount_paid INTEGER DEFAULT 0,
        payment_date DATE,
        payment_mode VARCHAR(50),
        recorded_by  INTEGER REFERENCES users(id),
        created_at  TIMESTAMP DEFAULT NOW(),
        UNIQUE(student_id, term, year)
      );

      -- NOTICES
      CREATE TABLE IF NOT EXISTS notices (
        id          SERIAL PRIMARY KEY,
        title       VARCHAR(255) NOT NULL,
        body        TEXT NOT NULL,
        audience    VARCHAR(50) DEFAULT 'all',   -- 'all','students','teachers','p7'
        posted_by   INTEGER REFERENCES users(id),
        created_at  TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('✅  All tables created successfully!\n');
    console.log('👉  Run:  node src/db/seed.js   to load sample data\n');
  } catch (err) {
    console.error('❌  Setup error:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

setup();
