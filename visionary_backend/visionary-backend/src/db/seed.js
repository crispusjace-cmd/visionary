// run with:  node src/db/seed.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const pool   = require('../../config/db');
const bcrypt = require('bcryptjs');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱  Seeding sample data...\n');
    await client.query('BEGIN');

    // ── HASH a default password for all demo accounts ──
    const hash = await bcrypt.hash('visionary123', 10);

    // ── USERS ──────────────────────────────────────────
    await client.query(`
      INSERT INTO users (email, password, role) VALUES
        ('admin@visionary.ug',       $1, 'admin'),
        ('m.obed@visionary.ug',      $1, 'teacher'),
        ('s.kemi@visionary.ug',      $1, 'teacher'),
        ('n.amos@visionary.ug',      $1, 'teacher'),
        ('b.faith@visionary.ug',     $1, 'teacher'),
        ('kato.oliver@visionary.ug', $1, 'student'),
        ('nakato.aisha@visionary.ug',$1, 'student'),
        ('mugisha.kevin@visionary.ug',$1,'student'),
        ('birungi.grace@visionary.ug',$1,'student'),
        ('okello.timothy@visionary.ug',$1,'student')
      ON CONFLICT (email) DO NOTHING
    `, [hash]);
    console.log('✅  Users seeded');

    // ── CLASSES ────────────────────────────────────────
    await client.query(`
      INSERT INTO classes (name, grade, stream, term_fee) VALUES
        ('P7A','P7','A',450000), ('P7B','P7','B',450000),
        ('P6A','P6','A',450000), ('P6B','P6','B',450000),
        ('P5A','P5','A',410000), ('P4C','P4','C',410000),
        ('P3B','P3','B',380000), ('P1A','P1','A',380000)
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('✅  Classes seeded');

    // ── SUBJECTS ───────────────────────────────────────
    await client.query(`
      INSERT INTO subjects (name, code) VALUES
        ('English Language','ENG'),
        ('Mathematics','MTH'),
        ('Science','SCI'),
        ('Social Studies','SST'),
        ('Luganda','LUG'),
        ('Religious Education','REL')
      ON CONFLICT (code) DO NOTHING
    `);
    console.log('✅  Subjects seeded');

    // ── TEACHERS (link to user accounts) ──────────────
    const teacherUsers = await client.query(
      `SELECT id, email FROM users WHERE role = 'teacher'`
    );
    const classP7A = await client.query(`SELECT id FROM classes WHERE name='P7A'`);
    const classP6B = await client.query(`SELECT id FROM classes WHERE name='P6B'`);

    const teacherData = [
      { email:'m.obed@visionary.ug',   name:'Mr. Musisi Obed',      phone:'+256 772 111 001', subject:'Mathematics',      class:'P7A' },
      { email:'s.kemi@visionary.ug',   name:'Mrs. Ssekitto Kemi',   phone:'+256 772 111 002', subject:'English Language',  class:'P6B' },
      { email:'n.amos@visionary.ug',   name:'Mr. Nkurunziza Amos',  phone:'+256 772 111 003', subject:'Science',           class:'P7A' },
      { email:'b.faith@visionary.ug',  name:'Mrs. Byarugaba Faith', phone:'+256 772 111 004', subject:'Social Studies',    class:'P6B' },
    ];

    for (const t of teacherData) {
      const userRow = teacherUsers.rows.find(u => u.email === t.email);
      const classRow = await client.query(`SELECT id FROM classes WHERE name=$1`, [t.class]);
      if (userRow && classRow.rows[0]) {
        await client.query(`
          INSERT INTO teachers (user_id, full_name, phone, subject, class_id)
          VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING
        `, [userRow.id, t.name, t.phone, t.subject, classRow.rows[0].id]);
      }
    }
    console.log('✅  Teachers seeded');

    // ── STUDENTS ───────────────────────────────────────
    const studentData = [
      { email:'kato.oliver@visionary.ug',   name:'Kato Oliver Ssemwanga',  roll:'001', cls:'P7A', dob:'2013-03-14', gender:'Male',   guardian:'Ssemwanga Robert', phone:'+256 772 000 001' },
      { email:'nakato.aisha@visionary.ug',  name:'Nakato Aisha',           roll:'002', cls:'P6B', dob:'2014-07-22', gender:'Female', guardian:'Nakato Sarah',     phone:'+256 772 000 002' },
      { email:'mugisha.kevin@visionary.ug', name:'Mugisha Kevin',          roll:'003', cls:'P7A', dob:'2015-01-05', gender:'Male',   guardian:'Mugisha Peter',    phone:'+256 772 000 003' },
      { email:'birungi.grace@visionary.ug', name:'Birungi Grace',          roll:'004', cls:'P7A', dob:'2013-09-30', gender:'Female', guardian:'Birungi James',    phone:'+256 772 000 004' },
      { email:'okello.timothy@visionary.ug',name:'Okello Timothy',         roll:'005', cls:'P7A', dob:'2016-04-18', gender:'Male',   guardian:'Okello Moses',     phone:'+256 772 000 005' },
    ];

    const studentUsers = await client.query(`SELECT id, email FROM users WHERE role='student'`);
    for (const s of studentData) {
      const userRow = studentUsers.rows.find(u => u.email === s.email);
      const classRow = await client.query(`SELECT id FROM classes WHERE name=$1`, [s.cls]);
      if (classRow.rows[0]) {
        await client.query(`
          INSERT INTO students (user_id, full_name, roll_number, class_id, dob, gender, guardian_name, guardian_phone)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (roll_number) DO NOTHING
        `, [userRow?.id||null, s.name, s.roll, classRow.rows[0].id, s.dob, s.gender, s.guardian, s.phone]);
      }
    }
    console.log('✅  Students seeded');

    // ── MARKS ──────────────────────────────────────────
    const marksData = [
      { roll:'001', scores:{ ENG:94, MTH:98, SCI:91, SST:96, LUG:88, REL:95 } },
      { roll:'002', scores:{ ENG:82, MTH:79, SCI:85, SST:80, LUG:75, REL:83 } },
      { roll:'003', scores:{ ENG:72, MTH:78, SCI:74, SST:71, LUG:69, REL:76 } },
      { roll:'004', scores:{ ENG:90, MTH:91, SCI:88, SST:93, LUG:85, REL:92 } },
      { roll:'005', scores:{ ENG:79, MTH:83, SCI:80, SST:77, LUG:74, REL:82 } },
    ];

    for (const m of marksData) {
      const stu = await client.query(`SELECT id FROM students WHERE roll_number=$1`, [m.roll]);
      if (!stu.rows[0]) continue;
      for (const [code, score] of Object.entries(m.scores)) {
        const subj = await client.query(`SELECT id FROM subjects WHERE code=$1`, [code]);
        if (!subj.rows[0]) continue;
        await client.query(`
          INSERT INTO marks (student_id, subject_id, term, year, score)
          VALUES ($1,$2,1,2026,$3) ON CONFLICT (student_id,subject_id,term,year) DO UPDATE SET score=$3
        `, [stu.rows[0].id, subj.rows[0].id, score]);
      }
    }
    console.log('✅  Marks seeded');

    // ── FEES ───────────────────────────────────────────
    const feeStatus = [
      { roll:'001', paid:450000, mode:'Mobile Money' },
      { roll:'002', paid:200000, mode:'Bank Transfer' },
      { roll:'003', paid:0,      mode:null },
      { roll:'004', paid:450000, mode:'Cash' },
      { roll:'005', paid:450000, mode:'Mobile Money' },
    ];

    for (const f of feeStatus) {
      const stu = await client.query(`
        SELECT s.id, c.term_fee FROM students s
        JOIN classes c ON s.class_id = c.id
        WHERE s.roll_number=$1`, [f.roll]);
      if (!stu.rows[0]) continue;
      await client.query(`
        INSERT INTO fees (student_id, term, year, amount_due, amount_paid, payment_mode)
        VALUES ($1,1,2026,$2,$3,$4)
        ON CONFLICT (student_id,term,year) DO UPDATE SET amount_paid=$3, payment_mode=$4
      `, [stu.rows[0].id, stu.rows[0].term_fee, f.paid, f.mode]);
    }
    console.log('✅  Fees seeded');

    // ── NOTICES ────────────────────────────────────────
    const adminUser = await client.query(`SELECT id FROM users WHERE role='admin' LIMIT 1`);
    const aid = adminUser.rows[0]?.id;
    await client.query(`
      INSERT INTO notices (title, body, audience, posted_by) VALUES
        ('Term 2 Examinations Schedule Released',
         'All P7 candidates must report by 7:00 AM on exam days. Parents notified via SMS.',
         'all', $1),
        ('PLE Mock Results Available',
         'Results for the January mock exams are now available in the student portal.',
         'students', $1),
        ('Open Day — 22 March 2026',
         'Parents and guardians are invited to the Annual Open Day. RSVP to the front office.',
         'all', $1),
        ('School Fees Deadline — Term 2',
         'All outstanding Term 1 balances must be cleared before Term 2 begins on 2 June 2026.',
         'all', $1)
      ON CONFLICT DO NOTHING
    `, [aid]);
    console.log('✅  Notices seeded\n');

    await client.query('COMMIT');
    console.log('🎉  Database seeded successfully!\n');
    console.log('─────────────────────────────────────────');
    console.log('Demo Login Accounts (password: visionary123)');
    console.log('─────────────────────────────────────────');
    console.log('Admin:   admin@visionary.ug');
    console.log('Teacher: m.obed@visionary.ug');
    console.log('Student: kato.oliver@visionary.ug\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌  Seed error:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
