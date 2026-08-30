import { Router } from 'express';
import axios from 'axios';

const router = Router();

// A handful of query patterns known to surface guest-post / contributor pages.
const TEMPLATES = [
  '"{kw}" "write for us"',
  '"{kw}" "guest post" "submit"',
  '"{kw}" "become a contributor"',
  '"{kw}" inurl:guest-post',
  '"{kw}" "submit a guest post"',
];

function buildQueries(keyword) {
  return TEMPLATES.map((t) => t.replace('{kw}', keyword));
}

async function searchGoogleCSE(query) {
  const { GOOGLE_CSE_API_KEY, GOOGLE_CSE_ID } = process.env;
  const resp = await axios.get('https://www.googleapis.com/customsearch/v1', {
    params: { key: GOOGLE_CSE_API_KEY, cx: GOOGLE_CSE_ID, q: query, num: 10 },
  });
  return (resp.data.items || []).map((item) => ({
    title: item.title,
    link: item.link,
    snippet: item.snippet,
  }));
}

async function searchSerpApi(query) {
  const resp = await axios.get('https://serpapi.com/search.json', {
    params: { q: query, api_key: process.env.SERPAPI_KEY, num: 10 },
  });
  return (resp.data.organic_results || []).map((item) => ({
    title: item.title,
    link: item.link,
    snippet: item.snippet,
  }));
}

// POST /api/guest-post/search  { keyword }
router.post('/search', async (req, res) => {
  const { keyword } = req.body || {};
  if (!keyword) return res.status(400).json({ error: 'Missing "keyword" in request body' });

  const hasGoogle = process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_ID;
  const hasSerp = process.env.SERPAPI_KEY;

  const queries = buildQueries(keyword);

  if (!hasGoogle && !hasSerp) {
    return res.json({
      demoMode: true,
      message:
        'No search API key configured. Add GOOGLE_CSE_API_KEY + GOOGLE_CSE_ID, or SERPAPI_KEY, to server/.env to get live results. Showing the search queries you can run manually in the meantime.',
      queries,
      results: [],
    });
  }

  try {
    const resultsByQuery = await Promise.all(
      queries.map(async (q) => ({
        query: q,
        results: hasSerp ? await searchSerpApi(q) : await searchGoogleCSE(q),
      }))
    );

    const flat = resultsByQuery.flatMap((r) =>
      r.results.map((item) => ({ ...item, matchedQuery: r.query }))
    );

    // De-dupe by domain, keep the first hit per domain.
    const byDomain = new Map();
    for (const item of flat) {
      try {
        const domain = new URL(item.link).hostname.replace(/^www\./, '');
        if (!byDomain.has(domain)) byDomain.set(domain, { ...item, domain });
      } catch {
        // skip malformed URLs
      }
    }

    res.json({
      demoMode: false,
      queries,
      results: Array.from(byDomain.values()),
    });
  } catch (err) {
    res.status(502).json({ error: `Search provider error: ${err.message}` });
  }
});

export default router;
