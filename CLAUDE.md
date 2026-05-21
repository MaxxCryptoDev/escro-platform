# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This workspace contains two independent projects:

1. **`escro-platform/`** — Full-stack escrow & milestone payment platform (Node.js + React)
2. **`zf_editor/`** — Python automation tool that scrapes ZF.ro news and generates social media reel content via Claude API

Root-level scripts (`restart_all.sh`, `migrate.js`, `fix_db.mjs`, etc.) are ad-hoc maintenance utilities for the escro platform.

---

## ESCRO Platform (`escro-platform/`)

### Stack
- **Backend**: Node.js (ESM modules, `"type": "module"`), Express 4, PostgreSQL via `pg`, JWT auth, Stripe payments, Socket.io, Multer file uploads
- **Frontend**: React 18, Vite 5, React Router 6, Axios, Socket.io-client
- **Database**: PostgreSQL (`escro_platform` DB, schema in `escro_platform_schema.sql`)

### Commands

```bash
# Backend
cd escro-platform/backend
npm install
cp .env.example .env          # fill in DB_PASSWORD, JWT_SECRET, STRIPE keys
npm run db:init               # initialize DB (runs scripts/initDb.js)
npm run dev                   # nodemon on port 5000
npm start                     # production

# Frontend
cd escro-platform/frontend
npm install
npm run dev                   # Vite dev server on port 3000
npm run build                 # outputs to dist/
```

### Architecture

```
escro-platform/
├── backend/
│   ├── server.js             # Express entry point, multer config, route registration
│   ├── config/               # DB pool (pg), Stripe client
│   ├── controllers/          # Business logic (auth, projects, milestones, escrow, admin)
│   ├── middleware/            # JWT auth guard, error handler
│   ├── routes/               # Express routers matching API endpoints
│   ├── services/             # Shared service helpers
│   ├── utils/                # Utility functions
│   └── scripts/              # initDb.js, setupDb.js
└── frontend/
    └── src/
        ├── context/           # AuthContext (JWT stored in localStorage)
        ├── pages/             # Role-specific dashboards: client, expert, admin
        └── services/          # Axios API client
```

**Payment flow**: Client deposits → Stripe PaymentIntent → escrow_accounts holds funds → Expert delivers milestone → Client approves → funds auto-released (commission deducted) → milestone_releases logged.

**Auth**: JWT, 7-day expiry, role-based (`client` / `expert` / `admin`). Admin email is `vladau.claudiu95@gmail.com`.

**File uploads**: deliverables go to `backend/uploads/deliverables/`, chat files to `backend/uploads/chat/`. Max 50 MB.

### Environment variables (backend `.env`)
```
PORT=5000
DB_HOST=localhost / DB_PORT=5432 / DB_USER=postgres / DB_PASSWORD=... / DB_NAME=escro_platform
JWT_SECRET=... / JWT_EXPIRE=7d
STRIPE_SECRET_KEY=sk_test_... / STRIPE_PUBLISHABLE_KEY=pk_test_... / STRIPE_WEBHOOK_SECRET=whsec_...
ADMIN_EMAIL=vladau.claudiu95@gmail.com
FRONTEND_URL=http://localhost:3000
```

### Stripe test cards
- Success: `4242 4242 4242 4242` | Decline: `4000 0000 0000 0002` | Any future expiry, any CVC

---

## ZF Editor (`zf_editor/`)

### Stack
- Python 3, `anthropic`, `requests`, `beautifulsoup4`, `lxml`
- Virtual env at `zf_editor/.venv/`
- API key in `zf_editor/.env` as `ANTHROPIC_API_KEY=...`
- Model configured in `config.json`: `claude-3-haiku-20240307`

### Commands

```bash
cd zf_editor
source .venv/bin/activate
pip install -r requirements.txt

# Full automated run: scrape ZF.ro sitemap, filter yesterday's articles, generate reels for top 10
python agent.py

# Process a single URL directly
python agent.py --url https://www.zf.ro/...

# Process a list of URLs from file
python agent.py --urls urls.txt

# Generate reel from whatever is currently in input.txt
python generator.py

# Monitor input.txt for changes (saves snapshots to output/YYYY-MM-DD/)
python monitor.py
```

### Data flow

1. `agent.py` (`ZFAgent`): fetches `zf.ro/sitemap.xml` → filters yesterday's articles → filters by Romanian business relevance keywords → fetches view counts in parallel (5 workers) → sorts by views → writes article content to `input.txt` → calls `generator.py` as subprocess for each article
2. `generator.py` (`ReelGenerator`): reads `input.txt` → extracts person name/title/company via regex patterns → calls Claude API (`claude-3-haiku`) → parses JSON response → saves `.md` to `output/YYYY-MM-DD/<title-slug>.md`

### Output format (`output/YYYY-MM-DD/*.md`)
```markdown
# Title (3-5 words)

Description (5-8 words)

---

*Name, Title la Company, spune că [message] 💬 👇*
```

Output must be 260-310 characters in `main_content`. The `generator.py` wraps content in `*...*` for italic formatting.

### Content filtering
- **Include**: Romania/Romanian business keywords (companies, investments, sectors, stock market, jobs)
- **Exclude**: `iran`, `ucraina`, `rusia`, `china`, `trump`, `putin` etc. — unless article also mentions Romania explicitly

### `config.json` settings
- `api_settings.model`: Claude model used for generation
- `output_settings.output_dir`: defaults to `./output`
- `content_generation.language`: `"ro"` (Romanian content)
