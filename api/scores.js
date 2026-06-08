import { kv } from '@vercel/kv';

const KEY = 'awv_scores_v2';
const MAX_SCORES = 10;

export default async function handler(req, res) {
  // Allow the game page to call this API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // GET /api/scores — return the top 10 scores
    if (req.method === 'GET') {
      const scores = (await kv.get(KEY)) ?? [];
      return res.json(scores);
    }

    // POST /api/scores — submit a new score, return updated top 10
    if (req.method === 'POST') {
      const { initials, score } = req.body ?? {};
      if (typeof initials !== 'string' || typeof score !== 'number') {
        return res.status(400).json({ error: 'initials (string) and score (number) are required' });
      }
      const scores = (await kv.get(KEY)) ?? [];
      scores.push({
        initials: initials.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'AAA',
        score: Math.max(0, Math.floor(score)),
      });
      scores.sort((a, b) => b.score - a.score);
      scores.splice(MAX_SCORES);
      await kv.set(KEY, scores);
      return res.json(scores);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[scores]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
