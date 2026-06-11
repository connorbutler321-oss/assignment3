import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  // Allow the game page to call this API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // GET /api/scores — return the top 10 scores
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT initials, score
        FROM highscores
        ORDER BY score DESC
        LIMIT 10
      `;
      return res.json(rows);
    }

    // POST /api/scores — submit a new score, return updated top 10
    if (req.method === 'POST') {
      const { initials, score } = req.body ?? {};
      if (typeof initials !== 'string' || typeof score !== 'number') {
        return res.status(400).json({ error: 'initials (string) and score (number) are required' });
      }

      const clean = initials.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'AAA';
      const pts   = Math.max(0, Math.floor(score));

      await sql`INSERT INTO highscores (initials, score) VALUES (${clean}, ${pts})`;

      const rows = await sql`
        SELECT initials, score
        FROM highscores
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
