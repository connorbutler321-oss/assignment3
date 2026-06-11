import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // GET /api/users → { count: N }
    if (req.method === 'GET') {
      const rows = await sql`SELECT COUNT(*) AS count FROM users`;
      return res.json({ count: parseInt(rows[0].count, 10) });
    }

    // POST /api/users { email }            → register/login
    //   returns { email, levelsUnlocked, isNew }
    // POST /api/users { email, unlock: N } → mark level N unlocked for user
    //   returns { email, levelsUnlocked }
    if (req.method === 'POST') {
      const { email, unlock } = req.body ?? {};
      if (typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'valid email required' });
      }
      const cleanEmail = email.trim().toLowerCase().slice(0, 255);

      if (typeof unlock === 'number') {
        await sql`
          UPDATE users
          SET levels_unlocked = GREATEST(levels_unlocked, ${unlock})
          WHERE email = ${cleanEmail}
        `;
        const rows = await sql`SELECT levels_unlocked FROM users WHERE email = ${cleanEmail}`;
        return res.json({ email: cleanEmail, levelsUnlocked: rows[0]?.levels_unlocked ?? 1 });
      }

      // Upsert — ON CONFLICT DO NOTHING preserves existing progress
      const inserted = await sql`
        INSERT INTO users (email, levels_unlocked)
        VALUES (${cleanEmail}, 1)
        ON CONFLICT (email) DO NOTHING
        RETURNING email
      `;
      const isNew = inserted.length > 0;
      const rows = await sql`SELECT levels_unlocked FROM users WHERE email = ${cleanEmail}`;
      return res.json({
        email: cleanEmail,
        levelsUnlocked: rows[0]?.levels_unlocked ?? 1,
        isNew,
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[users]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
