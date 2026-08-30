# Backlink Toolkit — Finance Blog Outreach

A Node.js/Express + React app for **white-hat** backlink work on a finance blog:
finding real guest-post opportunities, spotting broken links you can offer to replace,
and keeping a ledger of every backlink you build (with CSV / disavow export).

It does **not** auto-post links anywhere. Finance ("YMYL") sites are hit hardest by
Google's spam algorithms, so this tool is built around outreach you review and send
yourself, not automated link injection.

## What's inside

- **Broken Link Finder** — crawls a page you point it at, checks every outbound link,
  and lists the dead ones with anchor text. Use it to email the site owner: "this link
  is dead, here's a live replacement from my site."
- **Guest Post Finder** — builds search queries (`"investing" "write for us"`, etc.) and,
  if you add a search API key, runs them for you and lists candidate domains.
- **Backlink Ledger** — a simple CRUD tracker for backlinks you've earned: status
  (pending/live/lost/disavowed), quality (good/spam/unrated), notes. Exports a CSV and
  a Google-Search-Console-ready `disavow.txt` for anything marked spam.
- **Outreach (AI draft + send)** — from a Guest Post Finder result, click "Liên hệ" to have
  Claude draft a short, personalized pitch email. You review and edit it, enter the
  recipient's address, and click send — one email at a time, via your own Gmail account.
  A daily send cap (default 20/day) keeps volume in "personalized outreach" territory
  instead of "spam blast" territory. Nothing sends without you clicking send.
- **Entity Profile Assistant** — a curated checklist of reputable platforms (Google
  Business Profile, LinkedIn Company, Crunchbase, About.me, Gravatar, Medium, YouTube,
  Facebook, X, Trustpilot). For each one, AI drafts a bio tailored to that specific
  platform's format and audience — never spun/duplicated across platforms — and you
  open the real signup page, paste it in, and publish it yourself. A ledger tracks
  status per platform (not started / drafted / submitted / live).

**What this tool intentionally does NOT do:** auto-register accounts, auto-post
content, spin one piece of content into hundreds of "unique" copies, or submit links
in bulk without a human reviewing each one. Those are the mechanics behind most
"automated backlink" services, and they're what gets finance ("YMYL") sites penalized —
this tool automates the research and drafting, and leaves publishing to you.

## Project structure

```
backlink-tool/
  server/     Express API (port 4000)
  client/     React + Vite frontend (port 5173)
```

## Setup

### 1. Backend

```bash
cd server
npm install
cp .env.example .env
npm start
```

The Guest Post Finder works without any keys, but only returns the queries to run
manually. To get live results, add one of these to `server/.env`:

- **Google Programmable Search**: `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_ID`
  (https://programmablesearchengine.google.com/, https://developers.google.com/custom-search/v1/overview)
- **SerpAPI**: `SERPAPI_KEY` (https://serpapi.com/) — used instead of Google CSE if set

The Broken Link Finder and Backlink Ledger work fully with no external keys.

To use the **Outreach** feature (AI draft + Gmail send), add two more things to `server/.env`:

- **`ANTHROPIC_API_KEY`** — get one at https://console.anthropic.com/ (drafting won't work
  without it; you'll get a clear error in the UI instead of a silent failure).
- **`GMAIL_USER`** and **`GMAIL_APP_PASSWORD`** — to send from your own Gmail:
  1. Turn on 2-Step Verification on your Google account (required for App Passwords):
     https://myaccount.google.com/security
  2. Go to https://myaccount.google.com/apppasswords, create a new App Password
     (name it anything, e.g. "backlink tool"), and copy the 16-character password shown.
  3. Set `GMAIL_USER` to your full Gmail address, and `GMAIL_APP_PASSWORD` to that
     16-character password — **not** your normal Gmail login password.
- **`MAX_EMAILS_PER_DAY`** — optional, defaults to 20. Raising this a lot increases the
  risk of Gmail flagging your account for suspicious sending activity; keep it modest.

### 2. Frontend

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173 — it proxies `/api` calls to the backend on port 4000.

## Notes on data

The Backlink Ledger stores entries in `server/data/backlinks.json` (created
automatically). There's no database — swap in one later if you need multi-user
access or persistence beyond a single machine.

## Extending this

Ideas that fit the same white-hat approach:
- Pull live Domain Rating / Domain Authority per candidate via the Ahrefs or Moz API
  before you commit to outreach.
- Add an email-finder + templated outreach step to the Guest Post Finder (still
  reviewed/sent by a human, not auto-sent in bulk).
- Wire HARO/Qwoted-style query alerts for finance journalist requests.
