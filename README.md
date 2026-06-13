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

Screenshots can be generated with `node scripts/screenshots.mjs` after setting `BASE_URL` and `ADMIN_PASS` environment variables, or manually take screenshots of each page and save to `docs/images/`.

Expected files: `rankings.png`, `admin-panel.png`, `admin-users.png`, `admin-scores.png`, `accounts.png`, `login.png`

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

## Quick Start

### Prerequisites

- Node.js 18+
- npm
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account (free tier works)

### 1. Clone & Install

```bash
git clone <repo-url>
cd rok-manager
npm install
```

### 2. Set Up Cloudflare D1

```bash
# Login to Cloudflare
wrangler login

# Create a D1 database
wrangler d1 create rok-manager-db
```

Copy the `database_id` from the output and update `wrangler.toml`:

```toml
name = "rok-manager"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".svelte-kit/cloudflare"

[[d1_databases]]
binding = "DB"
database_name = "rok-manager-db"
database_id = "YOUR_DATABASE_ID_HERE"
```

### 3. Run Migrations

```bash
# Local development
wrangler d1 execute rok-manager-db --local --file=migrations/0001_init.sql
wrangler d1 execute rok-manager-db --local --file=migrations/0002_seed_admin.sql
wrangler d1 execute rok-manager-db --local --file=migrations/0003_user_bonus.sql

# Production (remote)
wrangler d1 execute rok-manager-db --remote --file=migrations/0001_init.sql
wrangler d1 execute rok-manager-db --remote --file=migrations/0002_seed_admin.sql
wrangler d1 execute rok-manager-db --remote --file=migrations/0003_user_bonus.sql
```

The seed migration (`0002_seed_admin.sql`) creates the admin user:
- **Username**: `admin`
- **Password**: (set in `migrations/0002_seed_admin.sql` — generate your own bcrypt hash)

> **Important**: Generate your own admin password hash before deploying!

### 4. Local Development

```bash
# Build first (required for Cloudflare adapter)
npm run build

# Start local dev server with D1
npm run preview
```

The app will be available at `http://localhost:8788`.

### 5. Deploy to Cloudflare Pages

```bash
# Build
npm run build

# Deploy
wrangler pages deploy .svelte-kit/cloudflare --project-name rok-manager
```

First deploy will create the Pages project. Subsequent deploys update it.

#### Bind D1 to Pages (first time only)

After the first deploy, bind the D1 database to the Pages project via the Cloudflare Dashboard:

1. Go to **Cloudflare Dashboard** > **Workers & Pages** > **rok-manager**
2. **Settings** > **Bindings** > **Add binding**
3. Select **D1 Database**, variable name: `DB`, select your database
4. **Save** and redeploy

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

1. Change the kingdom name in `src/lib/components/Navbar.svelte`
2. Update admin credentials in `migrations/0002_seed_admin.sql`
3. Adjust default scoring weights in `migrations/0001_init.sql`
4. Modify translations in `src/lib/i18n.ts`

### Scoring Weights

Change via **Admin > Scores** in the web UI. No code changes needed.

---

## LLM Setup Guide

This section is designed for AI assistants (Claude, GPT, etc.) to read and execute the setup process.

### Context

This is a SvelteKit 5 app using Svelte 5 runes (`$state()`, `$derived()`, `$props()`, `$effect()`, `getContext()`). It deploys to Cloudflare Pages with D1 (SQLite) as the database. The adapter is `@sveltejs/adapter-cloudflare`.

### Setup Steps (execute in order)

```
STEP 1: Install dependencies
  $ npm install

STEP 2: Login to Cloudflare
  $ wrangler login
  (User must complete OAuth in browser)

STEP 3: Create D1 database
  $ wrangler d1 create rok-manager-db
  NOTE: Copy the database_id from output

STEP 4: Update wrangler.toml
  Replace database_id value with the ID from Step 3

STEP 5: Run migrations (remote)
  $ wrangler d1 execute rok-manager-db --remote --file=migrations/0001_init.sql
  $ wrangler d1 execute rok-manager-db --remote --file=migrations/0002_seed_admin.sql
  $ wrangler d1 execute rok-manager-db --remote --file=migrations/0003_user_bonus.sql

STEP 6: Build
  $ npx vite build

STEP 7: Create Pages project (first time)
  $ wrangler pages project create rok-manager

STEP 8: Deploy
  $ wrangler pages deploy .svelte-kit/cloudflare --project-name rok-manager

STEP 9: Bind D1 to Pages project
  Via Cloudflare Dashboard: Workers & Pages > rok-manager > Settings > Bindings
  Add D1 binding: variable name = "DB", select the rok-manager-db database
  Then redeploy (repeat Step 8)

STEP 10: Verify
  Visit the deployed URL, login with admin / your-password
```

### Key Files for Modifications

| What to change | File(s) |
|----------------|---------|
| Kingdom name / branding | `src/lib/components/Navbar.svelte` |
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
