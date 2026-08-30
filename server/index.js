import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import brokenLinksRouter from './routes/brokenLinks.js';
import guestPostRouter from './routes/guestPost.js';
import backlinksRouter from './routes/backlinks.js';
import outreachRouter from './routes/outreach.js';
import entityProfilesRouter from './routes/entityProfiles.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/broken-links', brokenLinksRouter);
app.use('/api/guest-post', guestPostRouter);
app.use('/api/backlinks', backlinksRouter);
app.use('/api/outreach', outreachRouter);
app.use('/api/entity-profiles', entityProfilesRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backlink tool API running on http://localhost:${PORT}`);
});
