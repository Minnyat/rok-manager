# ROK Manager

> Kingdom management system for Rise of Kingdoms (ROK). Track DKP (Death-Kill Points), manage farm accounts, and maintain transparent rankings for KvK events.

## Features

| Feature | Description |
|---------|-------------|
| **DKP Rankings** | Automated scoring based on T4/T5 kills and deaths with configurable weights |
| **Farm Account Linking** | Players link farm accounts; farm DKP contributes a configurable % to main |
| **Combined & Individual** | View rankings with or without farm contributions |
| **Bonus DKP %** | King/Admin can assign bonus % to rally/garrison captains |
| **CSV Import** | Import player data from ROK kingdom stats CSV exports |
| **User Management** | Invite-based registration with role system (Admin/King/Player) |
| **Dispute System** | Players can report disputed account links for admin review |
| **i18n** | Vietnamese and English UI toggle |
| **Dark Theme** | Gaming-optimized dark UI |

## Screenshots

### Login
![Login](docs/images/login.png)

### Rankings — Combined view with DKP breakdown
![Rankings](docs/images/rankings.png)

### Admin Panel — Overview with stats and farm account links
![Admin Panel](docs/images/admin-panel.png)

### User Management — Create users, set DKP bonus %, manage invites
![Admin Users](docs/images/admin-users.png)

### DKP Scoring — Configurable weights and recalculation
![Scores](docs/images/admin-scores.png)

### Farm Accounts — Players link farm accounts to main
![Accounts](docs/images/accounts.png)

> Regenerate screenshots: `BASE_URL=https://your-app.pages.dev ADMIN_PASS=xxx node scripts/screenshots.mjs`

---

## Huong dan cho nguoi choi / Player Guide

### Dang nhap / Login

1. Nhan **link kich hoat** tu Admin/King
2. Click link > tao **ten dang nhap** va **mat khau** > xong!
3. Dang nhap tai trang chu voi tai khoan vua tao

### Xem xep hang / Rankings

- Vao tab **Rankings** (Xep hang) tren thanh menu
- **Combined (Tong hop)**: DKP ca nhan + farm account
- **Individual (Ca nhan)**: Chi tinh DKP ca nhan
- Click tieu de cot de sap xep (Power, T4 Kill, T5 Kill, DKP...)
- Badge xanh `+X%` ben canh ten = nguoi choi duoc bonus DKP

### Lien ket Farm Account

1. Vao tab **Accounts** (Tai khoan)
2. Nhap **Governor ID** hoac **ten** cua farm account
3. Click **Add (Them)** > farm DKP se tu dong cong vao tai khoan chinh
4. Muon go lien ket? Click **Remove (Xoa)** ben canh farm account

### Dashboard

- Xem thong tin ca nhan: Power, Kill, Dead, DKP
- Tu dong cap nhat khi Admin import du lieu moi

### Doi ngon ngu / Change Language

- Click nut **EN** hoac **VI** o goc phai tren thanh menu

---

## Huong dan cho Admin / Admin Guide

### Import du lieu

1. Xuat CSV tu ROK (qua tool third-party)
2. Vao **Admin > Import** > nhap ten phien ban (VD: "KvK S3 - Tuan 4")
3. Chon file CSV > click **Import**
4. Vao **Admin > Versions** > click **Kich hoat** phien ban vua import

### Quan ly Users

1. Vao **Admin > Users** > nhap ten hoac Governor ID vao o tim kiem
2. Chon governor tu dropdown > chon role (Player/King) > click **Create & get link**
3. Copy link kich hoat gui cho nguoi choi
4. Dat **Bonus %** cho captain rally/garrison: nhap so % > click **Save**

### Cau hinh DKP

1. Vao **Admin > Scores**
2. Thay doi trong so: T4 Kill, T5 Kill, Dead T4, Dead T5
3. Thay doi **Farm Contribution %** (mac dinh 40%)
4. Click **Save** > he thong tu dong tinh lai

### Xem tong quan

- **Admin > Tong quan**: So user active, pending, bao cao, lien ket farm
- Danh sach farm account links group theo user voi thong tin Power + DKP

---

## Tech Stack

- **Frontend**: SvelteKit 5, Svelte 5 (runes), Tailwind CSS 3
- **Backend**: SvelteKit server routes, Cloudflare Pages Functions
- **Database**: Cloudflare D1 (SQLite on edge)
- **Auth**: bcryptjs password hashing, cookie-based sessions
- **Hosting**: Cloudflare Pages
- **Adapter**: @sveltejs/adapter-cloudflare

## Quick Start (3 steps)

### Prerequisites

- [Node.js 18+](https://nodejs.org/) (click download, install, done)
- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free, no credit card needed)

### Step 1: Download & Install

```bash
git clone https://github.com/Minnyat/rok.git
cd rok
npm install
```

### Step 2: One-Command Setup

```bash
npm run setup
```

The setup script will guide you through:
- Login to Cloudflare (opens browser)
- Enter your kingdom name
- Choose admin password
- Auto-create database, run migrations, build & deploy

### Step 3: Bind Database (one-time, in browser)

After deploy, go to [Cloudflare Dashboard](https://dash.cloudflare.com):

1. **Workers & Pages** > **rok-manager** > **Settings** > **Bindings**
2. Click **Add binding** > **D1 Database**
3. Variable name: `DB`, select `rok-manager-db`
4. **Save** > run `npm run deploy` one more time

Done! Your app is live.

### Subsequent Deploys

```bash
npm run deploy
```

### Auto-Deploy from GitHub (optional)

Push to `master` = auto deploy. To enable:

1. Create a Cloudflare API Token at [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens):
   - Template: **Edit Cloudflare Workers**
   - Account Resources: your account
   - Zone Resources: all zones
2. Add 3 secrets to your GitHub repo (**Settings > Secrets > Actions**):
   - `CLOUDFLARE_API_TOKEN` — the token from step 1
   - `CLOUDFLARE_ACCOUNT_ID` — from Cloudflare Dashboard sidebar
   - `D1_DATABASE_ID` — from `wrangler d1 list`
3. Push code — GitHub Actions will build & deploy automatically

---

<details>
<summary><strong>Manual Setup (advanced)</strong></summary>

If you prefer to set up step by step:

#### Prerequisites

- Node.js 18+, npm
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account

#### 1. Clone & Install

```bash
git clone https://github.com/Minnyat/rok.git
cd rok
npm install
```

#### 2. Set Up Cloudflare D1

```bash
wrangler login
wrangler d1 create rok-manager-db
```

Copy the `database_id` from the output and update `wrangler.toml`.

#### 3. Set Admin Password

Generate a bcrypt hash and update `migrations/0002_seed_admin.sql`:

```bash
node -e "require('bcryptjs').hash('YourPassword',10).then(console.log)"
```

#### 4. Run Migrations

```bash
wrangler d1 execute rok-manager-db --remote --file=migrations/0001_init.sql
wrangler d1 execute rok-manager-db --remote --file=migrations/0002_seed_admin.sql
wrangler d1 execute rok-manager-db --remote --file=migrations/0003_user_bonus.sql
```

#### 5. Build & Deploy

```bash
npm run deploy
```

#### 6. Bind D1 to Pages

In Cloudflare Dashboard: Workers & Pages > rok-manager > Settings > Bindings > Add D1 binding (variable: `DB`). Save and redeploy.

</details>

## Project Structure

```
src/
  app.css                    # Tailwind + custom theme
  app.d.ts                   # TypeScript app types
  hooks.server.ts            # Auth middleware + i18n
  lib/
    i18n.ts                  # Vietnamese/English translations
    utils.ts                 # formatNumber, formatPower, formatDate
    server/
      auth.ts                # Password hashing, sessions, invite tokens
      db.ts                  # D1 database helper
      scores.ts              # DKP calculation engine
      scoring-config.ts      # Scoring weights config
    components/
      Navbar.svelte          # Navigation bar with lang toggle
      PlayerCard.svelte      # Player stats card
      Modal.svelte           # Reusable modal
  routes/
    +layout.svelte           # Root layout with i18n context
    +layout.server.ts        # Load user session + lang
    login/                   # Login page
    dashboard/               # Player dashboard
    rankings/                # DKP rankings (combined/individual)
    accounts/                # Sub account management (link/unlink farm)
    invite/[token]/          # Invite activation page
    admin/
      +page                  # Admin overview with stats + farm links
      users/                 # User management (create, bonus %, deactivate)
      import/                # CSV import
      versions/              # Data version management
      scores/                # DKP weight config + recalculate
      accounts/              # Account link management + disputes
    api/
      auth/logout            # Logout endpoint
      lang                   # Language toggle endpoint
      search-governor        # Governor search API
migrations/
  0001_init.sql              # Full schema
  0002_seed_admin.sql        # Admin user seed
  0003_user_bonus.sql        # Bonus DKP column
```

## How It Works

### DKP Scoring

DKP is calculated with configurable weights:

```
DKP = T4_Kill x W1 + T5_Kill x W2 + Dead_T4 x W3 + Dead_T5 x W4
```

Default weights: T4=1, T5=3, Dead_T4=5, Dead_T5=10

### Farm Account Contribution

Players can link farm accounts. Farm DKP contributes a configurable percentage (default 40%) to the main account's combined score:

```
Combined DKP = Individual DKP + Sum(Farm_DKP x Farm_Contribution_%)
```

### Bonus DKP

King/Admin can assign a bonus % to specific players (e.g., rally/garrison captains). The bonus applies to the player's individual DKP before farm contributions:

```
Boosted DKP = DKP_Raw x (1 + Bonus_%)
Combined = Boosted DKP + Farm Contributions
```

### Auto-Recalculate

Scores recalculate automatically when:
- A user links or unlinks a farm account
- Admin changes scoring weights
- Admin assigns a bonus %

### User Roles

| Role | Permissions |
|------|------------|
| **Admin** | Full access: import data, manage users, configure scores, manage accounts |
| **King** | Same as Admin (intended for kingdom leadership) |
| **Player** | View rankings, dashboard, manage own sub accounts |

### CSV Import

Export kingdom data from ROK (via third-party tools) as CSV. The CSV should contain columns:

```
Ranking, Governor ID, Governor Name, Camp, KD, Power, Power Diff, KP,
T4 Kill, T5 Kill, Dead, Acclaim, Healed, Dead T1-T5, DKP, Trades,
Credit Score, Kill Points, Death Points, Heal Points, Feeding Rate
```

Admin imports the CSV via **Admin > Import**, assigns a version name (e.g., "KvK S3 - Week 4"), then activates the version via **Admin > Versions**.

## Environment Variables

No environment variables needed. All configuration is in `wrangler.toml` and the `scoring_config` database table.

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts with roles, governor IDs, bonus % |
| `sessions` | Auth sessions (cookie-based) |
| `account_links` | Farm account links (user_id -> governor_id) |
| `data_versions` | Imported CSV versions |
| `player_data` | Raw player stats per version |
| `player_scores` | Calculated DKP scores per version |
| `scoring_config` | DKP weight configuration |
| `account_reports` | Disputed account reports |

## Customization

### For Your Own Kingdom

1. Edit `src/lib/config.ts` — set `kingdomName`, `kingdomNumber`, `subtitle`
2. Update admin credentials in `migrations/0002_seed_admin.sql`
3. Adjust default scoring weights in `migrations/0001_init.sql`
4. Modify translations in `src/lib/i18n.ts`

> Or just run `npm run setup` — it handles all of this interactively!

### Scoring Weights

Change via **Admin > Scores** in the web UI. No code changes needed.

---

## LLM Setup Guide

This section is designed for AI assistants (Claude, GPT, etc.) to read and execute the setup process.

### Context

This is a SvelteKit 5 app using Svelte 5 runes (`$state()`, `$derived()`, `$props()`, `$effect()`, `getContext()`). It deploys to Cloudflare Pages with D1 (SQLite) as the database. The adapter is `@sveltejs/adapter-cloudflare`.

### Quick Setup (recommended)

```
STEP 1: $ npm install
STEP 2: $ npm run setup
  (Interactive script: creates D1, sets password, migrates, builds, deploys)
STEP 3: Bind D1 in Cloudflare Dashboard (Workers & Pages > rok-manager > Settings > Bindings > Add D1 "DB")
STEP 4: $ npm run deploy
```

### Manual Setup (step by step)

```
STEP 1: $ npm install
STEP 2: $ wrangler login
STEP 3: $ wrangler d1 create rok-manager-db
  NOTE: Copy the database_id from output, update wrangler.toml
STEP 4: Generate admin password hash:
  $ node -e "require('bcryptjs').hash('YourPassword',10).then(console.log)"
  Update migrations/0002_seed_admin.sql with the hash
STEP 5: $ wrangler d1 execute rok-manager-db --remote --file=migrations/0001_init.sql
  $ wrangler d1 execute rok-manager-db --remote --file=migrations/0002_seed_admin.sql
  $ wrangler d1 execute rok-manager-db --remote --file=migrations/0003_user_bonus.sql
STEP 6: $ npm run deploy
STEP 7: Bind D1 in Cloudflare Dashboard, then $ npm run deploy again
```

### Key Files for Modifications

| What to change | File(s) |
|----------------|---------|
| Kingdom name / branding | `src/lib/config.ts` (all branding in one file) |
| Admin password | `migrations/0002_seed_admin.sql` (bcrypt hash) |
| Translations (vi/en) | `src/lib/i18n.ts` |
| Scoring formula | `src/lib/server/scores.ts` |
| Scoring weights (runtime) | Admin UI > Scores (stored in `scoring_config` table) |
| Database schema | `migrations/0001_init.sql` |
| Auth logic | `src/lib/server/auth.ts` |
| CSS theme / colors | `src/app.css` (Tailwind + CSS variables) |
| Tailwind config | `tailwind.config.js` |

### Important Patterns

```typescript
// Svelte 5 runes (NOT Svelte 4 stores)
let value = $state(initial);        // reactive state
let derived = $derived(expr);       // computed value
let { prop }: Props = $props();     // component props
$effect(() => { /* side effect */ });

// i18n pattern in components
import { getContext } from 'svelte';
const t: (key: string, params?: Record<string, string | number>) => string = getContext('t');
// Usage: {t('key')} or {t('key', { param: value })}

// Database access in server routes
import { getDb } from '$lib/server/db';
const db = getDb(platform);  // platform from SvelteKit load/action
const result = await db.prepare('SELECT ...').bind(...).first();

// D1 batch operations (max ~40 per batch)
const stmts = items.map(item => db.prepare('INSERT ...').bind(...));
await db.batch(stmts);
```

### Common Issues

| Issue | Solution |
|-------|----------|
| `DB is not defined` after deploy | D1 binding not set. Go to CF Dashboard > Pages > Settings > Bindings |
| Login fails after fresh deploy | Run seed migration: `0002_seed_admin.sql` on remote |
| Wrangler serves old code locally | Kill all node processes, rebuild, restart |
| `adapter-cloudflare` build error | Ensure `pages_build_output_dir` in wrangler.toml matches adapter output |
| TypeScript errors in `.svelte` | Svelte 5 runes require `lang="ts"` in script tag |

### CSV Format Reference

The CSV importer (via PapaParse) expects these column headers (case-insensitive, flexible matching):

```
Ranking, Governor ID, Governor Name, Camp, KD, Power, Power Diff,
KP, T4 Kill, T5 Kill, Dead, Acclaim, Healed,
Dead T1, Dead T2, Dead T3, Dead T4, Dead T5,
DKP, Trades, Credit Score, Kill Points, Death Points,
Heal Points, Feeding Rate
```

Numbers can use commas as thousand separators (e.g., "1,234,567").
