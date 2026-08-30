import { Router } from 'express';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '..', 'data', 'entity-profiles.json');

// A short, curated list of well-known, legitimate platforms worth having a real
// presence on. Each one requires an actual human to sign up and publish —
// this list is just a checklist + content assistant, not an automation target.
const PLATFORMS = [
  {
    id: 'google-business',
    name: 'Google Business Profile',
    url: 'https://www.google.com/business/',
    category: 'Bắt buộc',
    notes: 'Nền tảng quan trọng nhất cho local + brand entity. Cần xác minh địa chỉ/điện thoại thật.',
  },
  {
    id: 'linkedin-company',
    name: 'LinkedIn Company Page',
    url: 'https://www.linkedin.com/company/setup/new/',
    category: 'Bắt buộc',
    notes: 'Uy tín cao với Google và với khách hàng B2B/tài chính.',
  },
  {
    id: 'crunchbase',
    name: 'Crunchbase',
    url: 'https://www.crunchbase.com/add-new',
    category: 'Uy tín cao',
    notes: 'Rất tốt cho entity thuộc lĩnh vực tài chính, startup, fintech.',
  },
  {
    id: 'about-me',
    name: 'About.me',
    url: 'https://about.me/create',
    category: 'Uy tín cao',
    notes: 'Trang giới thiệu cá nhân/thương hiệu ngắn gọn, DA cao.',
  },
  {
    id: 'gravatar',
    name: 'Gravatar',
    url: 'https://gravatar.com/profile',
    category: 'Uy tín cao',
    notes: 'Gắn với email thương hiệu, hiển thị ở nhiều nơi bạn comment/đăng bài.',
  },
  {
    id: 'medium',
    name: 'Medium',
    url: 'https://medium.com/me/settings',
    category: 'Nội dung',
    notes: 'Có thể đăng lại (re-publish) bài blog tài chính kèm link canonical về site chính.',
  },
  {
    id: 'youtube',
    name: 'YouTube Channel',
    url: 'https://www.youtube.com/create_channel',
    category: 'Nội dung',
    notes: 'Nếu có video/podcast tài chính, kênh này vừa là entity vừa là nguồn traffic.',
  },
  {
    id: 'facebook-page',
    name: 'Facebook Page',
    url: 'https://www.facebook.com/pages/create',
    category: 'Mạng xã hội',
    notes: 'Tín hiệu social cơ bản, gần như bắt buộc với brand VN.',
  },
  {
    id: 'twitter-x',
    name: 'X (Twitter)',
    url: 'https://twitter.com/i/flow/signup',
    category: 'Mạng xã hội',
    notes: 'Tốt cho brand mention và tương tác nhanh với cộng đồng tài chính.',
  },
  {
    id: 'trustpilot',
    name: 'Trustpilot',
    url: 'https://business.trustpilot.com/signup',
    category: 'Uy tín/Review',
    notes: 'Tăng tín hiệu E-E-A-T (trust) nếu bạn có dịch vụ khách hàng đánh giá được.',
  },
];

async function readAll() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeAll(items) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(items, null, 2));
}

const router = Router();

// GET /api/entity-profiles/platforms — the curated static list
router.get('/platforms', (req, res) => {
  res.json(PLATFORMS);
});

// GET /api/entity-profiles — tracked status per platform
router.get('/', async (req, res) => {
  res.json(await readAll());
});

// POST /api/entity-profiles/draft
// { platformId, businessName, website, description, contactInfo }
// Drafts ONE tailored bio for ONE platform — not spun, not bulk.
router.post('/draft', async (req, res) => {
  const { platformId, businessName, website, description, contactInfo } = req.body || {};
  const platform = PLATFORMS.find((p) => p.id === platformId);
  if (!platform) return res.status(400).json({ error: 'Platform không hợp lệ' });
  if (!businessName || !website) {
    return res.status(400).json({ error: 'Cần tên thương hiệu và website' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(400).json({
      error: 'ANTHROPIC_API_KEY chưa được cấu hình trong server/.env.',
    });
  }

  const prompt = `Viết nội dung hồ sơ (bio/mô tả) bằng tiếng Việt cho nền tảng "${platform.name}" (${platform.notes}).

Thông tin thương hiệu:
- Tên: ${businessName}
- Website: ${website}
- Mô tả hoạt động: ${description || '(không có)'}
- Thông tin liên hệ: ${contactInfo || '(không có)'}

Yêu cầu:
- Nội dung THẬT, chính xác, không bịa số liệu hay thành tích không có trong thông tin trên.
- Độ dài và giọng văn phù hợp với đúng nền tảng "${platform.name}" (ví dụ LinkedIn Company trang trọng hơn, About.me ngắn gọn cá nhân hơn, Trustpilot tập trung vào dịch vụ khách hàng).
- Không nhồi nhét từ khóa SEO, viết tự nhiên như một hồ sơ thật.
- Trả lời CHỈ bằng JSON: {"bio": "..."} — không thêm text nào khác.`;

  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
      }
    );
    const text = response.data.content.map((b) => b.text || '').join('\n');
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    res.json({ platformId, bio: parsed.bio });
  } catch (err) {
    const detail = err.response?.data?.error?.message || err.message;
    res.status(502).json({ error: `Không soạn được nội dung: ${detail}` });
  }
});

// POST /api/entity-profiles — save/update status for a platform
// { platformId, status: 'not_started' | 'drafted' | 'submitted' | 'live', profileUrl, notes }
router.post('/', async (req, res) => {
  const items = await readAll();
  const { platformId } = req.body || {};
  if (!platformId) return res.status(400).json({ error: 'Missing platformId' });

  const idx = items.findIndex((i) => i.platformId === platformId);
  const entry = {
    platformId,
    status: req.body.status || 'drafted',
    profileUrl: req.body.profileUrl || '',
    notes: req.body.notes || '',
    updatedAt: new Date().toISOString(),
  };

  if (idx === -1) items.push(entry);
  else items[idx] = { ...items[idx], ...entry };

  await writeAll(items);
  res.json(entry);
});

export default router;
