import { Router } from 'express';
import axios from 'axios';
import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '..', 'data', 'outreach.json');

const DAILY_LIMIT = Number(process.env.MAX_EMAILS_PER_DAY || 20);

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

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

async function sentCountToday() {
  const items = await readAll();
  const today = todayKey();
  return items.filter((i) => i.status === 'sent' && i.sentAt?.slice(0, 10) === today).length;
}

const router = Router();

// GET /api/outreach — history of drafted/sent emails
router.get('/', async (req, res) => {
  const items = await readAll();
  res.json({
    items: items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    sentToday: await sentCountToday(),
    dailyLimit: DAILY_LIMIT,
  });
});

// POST /api/outreach/draft
// { siteDomain, pageTitle, snippet, pageUrl, keyword, senderName, senderSite, senderBio }
// Calls the Anthropic API to write a short, personalized guest-post pitch. Requires ANTHROPIC_API_KEY.
router.post('/draft', async (req, res) => {
  const { siteDomain, pageTitle, snippet, pageUrl, keyword, senderName, senderSite, senderBio } = req.body || {};
  if (!siteDomain) return res.status(400).json({ error: 'Missing "siteDomain" in request body' });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(400).json({
      error:
        'ANTHROPIC_API_KEY chưa được cấu hình trong server/.env. Thêm key rồi khởi động lại server để dùng tính năng soạn email tự động.',
    });
  }

  const prompt = `Bạn là một chuyên gia outreach cho blog tài chính. Hãy viết MỘT email ngắn gọn (dưới 150 từ), tự nhiên, không sáo rỗng, để đề nghị viết guest post hoặc hợp tác nội dung.

Thông tin trang web nhận email:
- Domain: ${siteDomain}
- Tiêu đề trang tham khảo: ${pageTitle || '(không có)'}
- Mô tả ngắn: ${snippet || '(không có)'}
- URL: ${pageUrl || '(không có)'}
- Từ khóa/chủ đề: ${keyword || '(không có)'}

Thông tin người gửi:
- Tên: ${senderName || '(chưa cung cấp — dùng "chúng tôi" chung chung)'}
- Trang web của người gửi: ${senderSite || '(chưa cung cấp)'}
- Giới thiệu ngắn: ${senderBio || '(chưa cung cấp)'}

Yêu cầu:
- Viết bằng tiếng Việt, giọng chuyên nghiệp nhưng thân thiện, không spam, không phóng đại.
- Nhắc cụ thể tới nội dung/chủ đề của trang nhận email để cho thấy đã tìm hiểu trước.
- Đề xuất rõ ràng: viết guest post hoặc đóng góp góc nhìn chuyên gia.
- Không dùng emoji, không viết hoa toàn bộ, không dùng ngôn ngữ ép buộc.
- Trả lời CHỈ bằng JSON, đúng format: {"subject": "...", "body": "..."} — không thêm text nào khác ngoài JSON.`;

  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
        max_tokens: 600,
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

    const items = await readAll();
    const draft = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      siteDomain,
      pageUrl: pageUrl || '',
      subject: parsed.subject,
      body: parsed.body,
      status: 'draft',
      createdAt: new Date().toISOString(),
      sentAt: null,
      recipientEmail: '',
    };
    items.push(draft);
    await writeAll(items);

    res.json(draft);
  } catch (err) {
    console.error('--- Lỗi khi gọi Anthropic API ---');
    console.error('HTTP status:', err.response?.status);
    console.error('Response body:', JSON.stringify(err.response?.data, null, 2));
    console.error('Error message:', err.message);
    console.error('----------------------------------');
    const detail = err.response?.data?.error?.message || err.message;
    res.status(502).json({ error: `Không soạn được email: ${detail}` });
  }
});

// PATCH /api/outreach/:id — edit subject/body/recipient before sending
router.patch('/:id', async (req, res) => {
  const items = await readAll();
  const idx = items.findIndex((i) => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  items[idx] = { ...items[idx], ...req.body, id: items[idx].id };
  await writeAll(items);
  res.json(items[idx]);
});

// POST /api/outreach/:id/send — actually sends via Gmail SMTP, one at a time, human-triggered.
router.post('/:id/send', async (req, res) => {
  const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    return res.status(400).json({
      error: 'GMAIL_USER và GMAIL_APP_PASSWORD chưa được cấu hình trong server/.env.',
    });
  }

  const sentToday = await sentCountToday();
  if (sentToday >= DAILY_LIMIT) {
    return res.status(429).json({
      error: `Đã đạt giới hạn ${DAILY_LIMIT} email/ngày. Thử lại vào ngày mai, hoặc tăng MAX_EMAILS_PER_DAY trong .env nếu bạn chắc chắn về deliverability.`,
    });
  }

  const items = await readAll();
  const idx = items.findIndex((i) => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const draft = items[idx];
  const recipientEmail = req.body?.recipientEmail || draft.recipientEmail;
  if (!recipientEmail) {
    return res.status(400).json({ error: 'Thiếu email người nhận.' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });

  try {
    await transporter.sendMail({
      from: GMAIL_USER,
      to: recipientEmail,
      subject: draft.subject,
      text: draft.body,
    });

    items[idx] = {
      ...draft,
      recipientEmail,
      status: 'sent',
      sentAt: new Date().toISOString(),
    };
    await writeAll(items);
    res.json(items[idx]);
  } catch (err) {
    res.status(502).json({ error: `Gửi email thất bại: ${err.message}` });
  }
});

// DELETE /api/outreach/:id
router.delete('/:id', async (req, res) => {
  const items = await readAll();
  const next = items.filter((i) => i.id !== req.params.id);
  await writeAll(next);
  res.json({ ok: true });
});

export default router;