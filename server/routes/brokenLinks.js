import { Router } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = Router();

const CONCURRENCY = 8;
const TIMEOUT_MS = 8000;

async function checkLink(url) {
  try {
    const res = await axios.get(url, {
      timeout: TIMEOUT_MS,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: { 'User-Agent': 'Mozilla/5.0 (BacklinkTool/1.0; +finance-blog-outreach)' },
    });
    return { status: res.status, ok: res.status >= 200 && res.status < 400 };
  } catch (err) {
    return { status: null, ok: false, error: err.code || err.message };
  }
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const current = idx++;
      results[current] = await fn(items[current], current);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

// POST /api/broken-links/scan  { url }
// Crawls the given page, extracts outbound links, checks each for a dead status.
router.post('/scan', async (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'Missing "url" in request body' });

  let pageHtml;
  try {
    const pageRes = await axios.get(url, {
      timeout: TIMEOUT_MS,
      headers: { 'User-Agent': 'Mozilla/5.0 (BacklinkTool/1.0; +finance-blog-outreach)' },
    });
    pageHtml = pageRes.data;
  } catch (err) {
    return res.status(422).json({ error: `Could not fetch the page: ${err.message}` });
  }

  const $ = cheerio.load(pageHtml);
  const seen = new Set();
  const links = [];

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim().slice(0, 120);
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;
    let absolute;
    try {
      absolute = new URL(href, url).toString();
    } catch {
      return;
    }
    if (seen.has(absolute)) return;
    seen.add(absolute);
    links.push({ href: absolute, text });
  });

  const checked = await mapWithConcurrency(links, CONCURRENCY, async (link) => {
    const result = await checkLink(link.href);
    return { ...link, ...result };
  });

  const broken = checked.filter((l) => !l.ok);

  res.json({
    scannedUrl: url,
    totalLinks: checked.length,
    brokenCount: broken.length,
    broken,
    all: checked,
  });
});

export default router;
