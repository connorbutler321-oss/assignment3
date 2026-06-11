import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const VALID_LEVELS = ['level1', 'level2'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // GET /api/scores?level=level1  — top 10 for that level
    if (req.method === 'GET') {
      const level = VALID_LEVELS.includes(req.query?.level) ? req.query.level : 'level1';
      const rows = await sql`
        SELECT initials, score
        FROM highscores
        WHERE level = ${level}
        ORDER BY score DESC
        LIMIT 10
      `;
      return res.json(rows);
    }

    // POST /api/scores  { initials, score, level }
    if (req.method === 'POST') {
      const { initials, score, level } = req.body ?? {};
      if (typeof initials !== 'string' || typeof score !== 'number') {
        return res.status(400).json({ error: 'initials (string) and score (number) are required' });
      }

      const clean      = initials.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'AAA';
      const pts        = Math.max(0, Math.floor(score));
      const cleanLevel = VALID_LEVELS.includes(level) ? level : 'level1';

      await sql`INSERT INTO highscores (initials, score, level) VALUES (${clean}, ${pts}, ${cleanLevel})`;

      const rows = await sql`
        SELECT initials, score
        FROM highscores
        WHERE level = ${cleanLevel}
        ORDER BY score DESC
        LIMIT 10
      `;
      return res.json(rows);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[scores]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
