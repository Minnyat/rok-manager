# ROK Manager

> Kingdom management system for Rise of Kingdoms (ROK). Track DKP (Death-Kill Points), manage farm accounts, and maintain transparent rankings for KvK events.

**[Tiếng Việt](#hướng-dẫn-tiếng-việt)** | **[English](#english-guide)** | **[Donate](#donate--ủng-hộ)**

**Miễn phí sử dụng** | **Free to use** | License: [MIT Non-Commercial](LICENSE)

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

---

# Hướng dẫn tiếng Việt

## Tính năng

| Tính năng | Mô tả |
|-----------|-------|
| **Multi-KvK Support** | Quản lý nhiều KvK cùng lúc, mỗi KvK có dữ liệu và cấu hình riêng |
| **Formula Plugin System** | Hệ thống plugin linh hoạt: DKP, FFA, Weighted Kill, Custom formulas |
| **Bảng xếp hạng DKP** | Tính điểm tự động dựa trên formula được chọn cho mỗi KvK |
| **Player Profiles** | Xem chi tiết thống kê cá nhân tại `/players/[governorId]` |
| **Liên kết Farm Account** | Người chơi liên kết tài khoản phụ; DKP farm đóng góp % vào tài khoản chính |
| **Tổng hợp & Cá nhân** | Xem xếp hạng có hoặc không có đóng góp farm |
| **Bonus DKP %** | King/Admin cộng thêm % cho captain rally/garrison (per-KvK) |
| **Import CSV** | Nhập dữ liệu từ file CSV xuất từ ROK (per-KvK) |
| **Quản lý người dùng** | Đăng ký qua link mời, phân quyền Admin/King/Player |
| **Báo cáo tranh chấp** | Người chơi báo cáo liên kết tài khoản sai |
| **Đa ngôn ngữ** | Chuyển đổi tiếng Việt / tiếng Anh |
| **Giao diện tối** | Thiết kế tối ưu cho game |

## Dành cho người chơi

### Đăng nhập

1. Nhận **link kích hoạt** từ Admin/King
2. Bấm vào link > tạo **tên đăng nhập** và **mật khẩu** > xong!
3. Đăng nhập tại trang chủ với tài khoản vừa tạo

### Xem xếp hạng

- Vào tab **Xếp hạng** trên thanh menu
- **Tổng hợp**: DKP cá nhân + farm account
- **Cá nhân**: Chỉ tính DKP cá nhân
- Bấm tiêu đề cột để sắp xếp (Power, T4 Kill, T5 Kill, DKP...)
- Badge xanh `+X%` bên cạnh tên = người chơi được bonus DKP

### Liên kết Farm Account

1. Vào tab **Tài khoản**
2. Nhập **Governor ID** hoặc **tên** của farm account
3. Bấm **Thêm** > DKP farm sẽ tự động cộng vào tài khoản chính
4. Muốn gỡ liên kết? Bấm **Xóa** bên cạnh farm account

### Dashboard

- Xem thông tin cá nhân: Power, Kill, Dead, DKP
- Tự động cập nhật khi Admin import dữ liệu mới

### Đổi ngôn ngữ

- Bấm nút **EN** hoặc **VI** ở góc phải trên thanh menu

## Dành cho Admin

### Quản lý KvK

1. Vào **Admin > KvK** để xem danh sách tất cả KvK
2. Bấm **Tạo KvK mới** > nhập tên, slug, mô tả
3. Chọn **Formula Type** cho KvK (DKP, FFA, Weighted Kill, Custom)
4. Cấu hình tham số formula cho từng KvK

### Import dữ liệu (per-KvK)

1. Xuất CSV từ ROK (qua tool bên thứ ba)
2. Vào **Admin > KvK > [tên KvK] > Import**
3. Nhập tên phiên bản (VD: "Tuần 4")
4. Chọn file CSV > bấm **Import**
5. Vào **Admin > KvK > [tên KvK] > Versions** > bấm **Kích hoạt** phiên bản

### Quản lý người dùng

1. Vào **Admin > Users** > nhập tên hoặc Governor ID vào ô tìm kiếm
2. Chọn governor từ dropdown > chọn role (Player/King) > bấm **Tạo & lấy link**
3. Copy link kích hoạt gửi cho người chơi
4. Đặt **Bonus %** cho captain rally/garrison: nhập số % > bấm **Lưu**

### Cấu hình DKP (per-KvK)

1. Vào **Admin > KvK > [tên KvK] > Scores**
2. Chọn **Formula Type** (DKP, FFA, Weighted Kill, Custom)
3. Cấu hình tham số cho formula được chọn
4. Bấm **Lưu** > hệ thống tự động tính lại

### Xem tổng quan

- **Admin > Tổng quan**: Số user hoạt động, chờ kích hoạt, báo cáo, liên kết farm
- Danh sách farm account links nhóm theo user với thông tin Power + DKP

## Cài đặt nhanh (3 bước)

### Yêu cầu

- [Node.js 18+](https://nodejs.org/) (tải về, cài đặt, xong)
- [Tài khoản Cloudflare](https://dash.cloudflare.com/sign-up) (miễn phí, không cần thẻ)

### Bước 1: Tải về & cài đặt

```bash
git clone https://github.com/Minnyat/rok-manager.git
cd rok-manager
npm install
```

### Bước 2: Chạy lệnh cài đặt

```bash
npm run setup
```

Script sẽ hướng dẫn bạn:

- Đăng nhập Cloudflare (mở trình duyệt)
- Nhập tên kingdom
- Chọn mật khẩu admin
- Tự động tạo database, chạy migrations, build & deploy

### Bước 3: Kết nối Database (một lần duy nhất)

Sau khi deploy, vào [Cloudflare Dashboard](https://dash.cloudflare.com):

1. **Workers & Pages** > **rok-manager** > **Settings** > **Bindings**
2. Bấm **Add binding** > **D1 Database**
3. Tên biến: `DB`, chọn `rok-manager-db`
4. **Lưu** > chạy `npm run deploy` một lần nữa

Xong! Ứng dụng đã hoạt động.

### Tự động deploy từ GitHub (tùy chọn)

Push code lên `master` = tự động deploy. Để bật:

1. Tạo Cloudflare API Token tại [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens):
   - Template: **Edit Cloudflare Workers**
2. Thêm 3 secrets vào GitHub repo (**Settings > Secrets > Actions**):
   - `CLOUDFLARE_API_TOKEN` — token vừa tạo
   - `CLOUDFLARE_ACCOUNT_ID` — từ Cloudflare Dashboard
   - `D1_DATABASE_ID` — từ `wrangler d1 list`
3. Push code — GitHub Actions sẽ tự động build & deploy

---

# English Guide

## Features

| Feature | Description |
|---------|-------------|
| **Multi-KvK Support** | Manage multiple KvKs simultaneously, each with its own data and configuration |
| **Formula Plugin System** | Flexible plugin system: DKP, FFA, Weighted Kill, Custom formulas |
| **DKP Rankings** | Automated scoring based on the formula selected for each KvK |
| **Player Profiles** | View detailed individual stats at `/players/[governorId]` |
| **Farm Account Linking** | Players link farm accounts; farm DKP contributes a configurable % to main |
| **Combined & Individual** | View rankings with or without farm contributions |
| **Bonus DKP %** | King/Admin can assign bonus % to rally/garrison captains (per-KvK) |
| **CSV Import** | Import player data from ROK kingdom stats CSV exports (per-KvK) |
| **User Management** | Invite-based registration with role system (Admin/King/Player) |
| **Dispute System** | Players can report disputed account links for admin review |
| **i18n** | Vietnamese and English UI toggle |
| **Dark Theme** | Gaming-optimized dark UI |

## For Players

### Login

1. Receive an **activation link** from Admin/King
2. Click the link > create a **username** and **password** > done!
3. Login at the homepage with your new account

### View Rankings

- Go to the **Rankings** tab in the menu
- **Combined**: Personal DKP + farm account contributions
- **Individual**: Personal DKP only
- Click column headers to sort (Power, T4 Kill, T5 Kill, DKP...)
- Green badge `+X%` next to a name = player has bonus DKP

### Link Farm Accounts

1. Go to the **Accounts** tab
2. Enter the **Governor ID** or **name** of your farm account
3. Click **Add** > farm DKP will automatically contribute to your main account
4. Want to unlink? Click **Remove** next to the farm account

### Dashboard

- View your personal stats: Power, Kill, Dead, DKP
- Auto-updates when Admin imports new data

### Change Language

- Click the **EN** or **VI** button in the top-right corner of the menu

## For Admins

### Manage KvK

1. Go to **Admin > KvK** to view all KvKs
2. Click **Create new KvK** > enter name, slug, description
3. Select **Formula Type** for the KvK (DKP, FFA, Weighted Kill, Custom)
4. Configure formula parameters for each KvK

### Import Data (per-KvK)

1. Export CSV from ROK (via third-party tools)
2. Go to **Admin > KvK > [KvK Name] > Import**
3. Enter a version name (e.g., "Week 4")
4. Choose the CSV file > click **Import**
5. Go to **Admin > KvK > [KvK Name] > Versions** > click **Activate**

### Manage Users

1. Go to **Admin > Users** > type a name or Governor ID in the search box
2. Select a governor from the dropdown > choose role (Player/King) > click **Create & get link**
3. Copy the activation link and send it to the player
4. Set **Bonus %** for rally/garrison captains: enter the % > click **Save**

### Configure DKP (per-KvK)

1. Go to **Admin > KvK > [KvK Name] > Scores**
2. Select **Formula Type** (DKP, FFA, Weighted Kill, Custom)
3. Configure parameters for the selected formula
4. Click **Save** > scores recalculate automatically

### Overview

- **Admin > Overview**: Active users, pending activations, reports, farm links
- Farm account links grouped by user with Power + DKP info

## Quick Start (3 steps)

### Prerequisites

- [Node.js 18+](https://nodejs.org/) (download, install, done)
- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free, no credit card needed)

### Step 1: Download & Install

```bash
git clone https://github.com/Minnyat/rok-manager.git
cd rok-manager
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

<details>
<summary><strong>Manual Setup (advanced)</strong></summary>

#### Prerequisites

- Node.js 18+, npm
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account

#### 1. Clone & Install

```bash
git clone https://github.com/Minnyat/rok-manager.git
cd rok-manager
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

---

## Technical Reference

### Tech Stack

- **Frontend**: SvelteKit 5, Svelte 5 (runes), Tailwind CSS 3
- **Backend**: SvelteKit server routes, Cloudflare Pages Functions
- **Database**: Cloudflare D1 (SQLite on edge)
- **Auth**: bcryptjs password hashing, cookie-based sessions
- **Hosting**: Cloudflare Pages
- **Adapter**: @sveltejs/adapter-cloudflare

### Project Structure

```
src/
  app.css                    # Tailwind + custom theme
  app.d.ts                   # TypeScript app types
  hooks.server.ts            # Auth middleware + i18n
  lib/
    config.ts                # Kingdom name, branding (edit this!)
    i18n.ts                  # Vietnamese/English translations
    utils.ts                 # formatNumber, formatPower, formatDate
    server/
      auth.ts                # Password hashing, sessions, invite tokens
      db.ts                  # D1 database helper
      kvk.ts                 # KvK management helpers
      scores.ts              # DKP calculation engine
      scoring-config.ts      # Scoring weights config
      formulas/
        registry.ts          # Formula plugin registry
        dkp.ts               # DKP formula (default)
        ffa.ts               # FFA formula
        weighted-kill.ts     # Weighted Kill formula
        custom.ts            # Custom formula
    components/
      Navbar.svelte          # Navigation bar with lang toggle
      KvkSelector.svelte     # KvK selector dropdown
      PlayerCard.svelte      # Player stats card
      Modal.svelte           # Reusable modal
  routes/
    +layout.svelte           # Root layout with i18n context
    +layout.server.ts        # Load user session + lang
    login/                   # Login page
    dashboard/               # Player dashboard
    rankings/                # DKP rankings (combined/individual)
    accounts/                # Sub account management (link/unlink farm)
    players/[governorId]/    # Player profile page
    invite/[token]/          # Invite activation page
    admin/
      +page                  # Admin overview with stats + farm links
      users/                 # User management (create, bonus %, deactivate)
      accounts/              # Account link management + disputes
      kvks/                  # KvK management
        +page                # KvK list
        [kvkSlug]/           # KvK detail
          +page              # KvK overview
          import/            # CSV import (per-KvK)
          versions/          # Data version management (per-KvK)
          scores/            # DKP config & formula selection (per-KvK)
          bonuses/           # Bonus recipients (per-KvK)
    api/
      auth/logout            # Logout endpoint
      lang                   # Language toggle endpoint
      search-governor        # Governor search API
      players/search         # Player search API
migrations/
  0001_init.sql              # Full schema
  0002_seed_admin.sql        # Admin user seed
  0003_user_bonus.sql        # Bonus DKP column
  0004_kvk_core.sql          # KvK table and relations
  0005_kvk_scoring_bonus.sql # Per-KvK scoring and bonus
  0006_kvk_account_links.sql # Per-KvK account links
  0007_formula_plugin.sql    # Formula plugin columns
  0008_kvk_unique_name.sql   # KvK name uniqueness
```

### How It Works

#### Formula Plugin System

Each KvK can use a different scoring formula. The system supports:

| Formula | Description | Parameters |
|---------|-------------|------------|
| **DKP** | Default scoring based on T4/T5 kills and deaths | `t4_kill_weight`, `t5_kill_weight`, `dead_t4_weight`, `dead_t5_weight` |
| **FFA** | Free-for-all scoring | Custom parameters |
| **Weighted Kill** | Kill-focused scoring with weights | Custom parameters |
| **Custom** | Fully customizable formula | User-defined parameters |

#### DKP Scoring (Default Formula)

```
DKP = T4 × t4_kill_weight + T5 × t5_kill_weight + Dead_T4 × dead_t4_weight + Dead_T5 × dead_t5_weight
```

Default weights: T4=1, T5=3, Dead_T4=2, Dead_T5=4

#### Farm Account Contribution

```
Combined DKP = Individual DKP + Sum(Farm_DKP × Farm_Contribution_%)
```

#### Bonus DKP (per-KvK)

```
Boosted DKP = DKP_Raw × (1 + Bonus_%)
Combined = Boosted DKP + Farm Contributions
```

#### Auto-Recalculate

Scores recalculate automatically when:

- A user links or unlinks a farm account
- Admin changes scoring formula or weights
- Admin assigns a bonus %
- Admin activates a new data version

### User Roles

| Role | Permissions |
|------|------------|
| **Admin** | Full access: manage KvKs, import data, manage users, configure scores, manage accounts |
| **King** | Same as Admin (intended for kingdom leadership) |
| **Player** | View rankings, dashboard, manage own sub accounts |

### Database Schema

| Table | Purpose |
|-------|---------|
| `users` | User accounts with roles, governor IDs, bonus % |
| `sessions` | Auth sessions (cookie-based) |
| `kvks` | KvK events with formula configuration |
| `account_links` | Farm account links (user_id → governor_id) |
| `data_versions` | Imported CSV versions (per-KvK) |
| `player_data` | Raw player stats per version |
| `player_scores` | Calculated DKP scores per version |
| `scoring_config` | DKP weight configuration |
| `account_reports` | Disputed account reports |
| `kvk_bonus_recipients` | Per-KvK bonus recipients |

### Customization

1. Edit `src/lib/config.ts` — set `kingdomName`, `kingdomNumber`, `subtitle`
2. Update admin credentials in `migrations/0002_seed_admin.sql`
3. Modify translations in `src/lib/i18n.ts`
4. Configure formula and weights via **Admin > KvK > [KvK Name] > Scores** (no code changes needed)
5. Add custom formulas by creating new files in `src/lib/server/formulas/` and registering them

> Or just run `npm run setup` — it handles all of this interactively!

### CSV Format

The CSV importer (via PapaParse) expects these column headers (case-insensitive, flexible matching):

```
Ranking, Governor ID, Governor Name, Camp, KD, Power, Power Diff,
KP, T4 Kill, T5 Kill, Dead, Acclaim, Healed,
Dead T1, Dead T2, Dead T3, Dead T4, Dead T5,
DKP, Trades, Credit Score, Kill Points, Death Points,
Heal Points, Feeding Rate
```

Numbers can use commas as thousand separators (e.g., "1,234,567").

---

## Donate / Ủng hộ

Dự án được phát triển và duy trì miễn phí. Nếu bạn thấy hữu ích, bạn có thể ủng hộ tác giả qua QR bên dưới:

This project is developed and maintained for free. If you find it useful, you can support the author via QR below:

<p align="center">
  <img src="docs/images/donate-qr.jpg" alt="Donate QR" width="250" />
</p>

---

## Liên hệ / Contact

| | |
|---|---|
| **Discord** | `minnyat` |
| **Facebook** | [fb.com/MinNyat.me](https://www.facebook.com/MinNyat.me) |

Hỗ trợ setup, báo lỗi, góp ý — liên hệ qua Discord hoặc Facebook.

---

## Đóng góp / Contributing

Mọi đóng góp đều được chào đón! / All contributions are welcome!

1. Fork repo
2. Tạo branch mới: `git checkout -b feature/ten-tinh-nang`
3. Commit thay đổi
4. Tạo Pull Request

---

## Giấy phép / License

[MIT Non-Commercial](LICENSE) - Miễn phí sử dụng, chỉnh sửa, phân phối. **Không được phép thương mại hóa** dựa trên dự án này.

Free to use, modify, and distribute. **Commercial use is not permitted.**

---

## LLM Setup Guide

This section is designed for AI assistants (Claude, GPT, etc.) to read and execute the setup process.

### Context

SvelteKit 5 app using Svelte 5 runes (`$state()`, `$derived()`, `$props()`, `$effect()`, `getContext()`). Deploys to Cloudflare Pages with D1 (SQLite). Adapter: `@sveltejs/adapter-cloudflare`.

### Quick Setup

```
STEP 1: $ npm install
STEP 2: $ npm run setup
  (Interactive: creates D1, sets password, migrates, builds, deploys)
STEP 3: Bind D1 in Cloudflare Dashboard (Workers & Pages > rok-manager > Settings > Bindings > Add D1 "DB")
STEP 4: $ npm run deploy
```

### Manual Setup

```
STEP 1: $ npm install
STEP 2: $ wrangler login
STEP 3: $ wrangler d1 create rok-manager-db
  NOTE: Copy database_id, update wrangler.toml
STEP 4: Generate admin password hash:
  $ node -e "require('bcryptjs').hash('YourPassword',10).then(console.log)"
  Update migrations/0002_seed_admin.sql with the hash
STEP 5: Run all migrations in order:
  $ wrangler d1 execute rok-manager-db --remote --file=migrations/0001_init.sql
  $ wrangler d1 execute rok-manager-db --remote --file=migrations/0002_seed_admin.sql
  $ wrangler d1 execute rok-manager-db --remote --file=migrations/0003_user_bonus.sql
  $ wrangler d1 execute rok-manager-db --remote --file=migrations/0004_kvk_core.sql
  $ wrangler d1 execute rok-manager-db --remote --file=migrations/0005_kvk_scoring_bonus.sql
  $ wrangler d1 execute rok-manager-db --remote --file=migrations/0006_kvk_account_links.sql
  $ wrangler d1 execute rok-manager-db --remote --file=migrations/0007_formula_plugin.sql
  $ wrangler d1 execute rok-manager-db --remote --file=migrations/0008_kvk_unique_name.sql
STEP 6: $ npm run deploy
STEP 7: Bind D1 in Cloudflare Dashboard, then $ npm run deploy again
```

### Key Files

| What to change | File(s) |
|----------------|---------|
| Kingdom name / branding | `src/lib/config.ts` |
| Admin password | `migrations/0002_seed_admin.sql` (bcrypt hash) |
| Translations (vi/en) | `src/lib/i18n.ts` |
| Scoring formulas | `src/lib/server/formulas/*.ts` |
| Formula registry | `src/lib/server/formulas/registry.ts` |
| KvK management | `src/lib/server/kvk.ts` |
| Scoring weights (runtime) | Admin UI > KvK > Scores (stored in `kvks.formula_params` JSON) |
| Database schema | `migrations/0001_init.sql` + `0004-0008_*.sql` |
| Auth logic | `src/lib/server/auth.ts` |
| CSS theme / colors | `src/app.css` (Tailwind + CSS variables) |
| Tailwind config | `tailwind.config.js` |

### Code Patterns

```typescript
// Svelte 5 runes (NOT Svelte 4 stores)
let value = $state(initial);
let derived = $derived(expr);
let { prop }: Props = $props();
$effect(() => { /* side effect */ });

// i18n in components
import { getContext } from 'svelte';
const t: (key: string, params?: Record<string, string | number>) => string = getContext('t');

// Database access in server routes
import { getDb } from '$lib/server/db';
const db = getDb(platform);
const result = await db.prepare('SELECT ...').bind(...).first();

// KvK helpers
import { getSelectedKvk, getActiveVersionForKvk } from '$lib/server/kvk';
const kvk = await getSelectedKvk(db, url);
const version = kvk ? await getActiveVersionForKvk(db, kvk.id) : null;

// Formula plugin usage
import { getFormula, getAllFormulas } from '$lib/server/formulas/registry';
import '$lib/server/formulas/dkp';      // auto-register
import '$lib/server/formulas/ffa';      // auto-register
const formula = getFormula('dkp');
const results = formula.calculate(playerData, params);

// D1 batch operations (max ~40 per batch)
const stmts = items.map(item => db.prepare('INSERT ...').bind(...));
await db.batch(stmts);
```

### Adding Custom Formulas

Create a new file in `src/lib/server/formulas/`:

```typescript
import { registerFormula, type Formula } from "./registry";

const myFormula: Formula = {
  id: "my-formula",
  name: "My Custom Formula",
  description: "Custom scoring formula",
  params: [
    {
      key: "weight_1",
      type: "number",
      default: 1,
      label: "Weight 1",
      min: 0,
      max: 100,
    },
  ],
  requiredColumns: ["column1", "column2"],
  calculate(playerData, params) {
    return playerData.map((p) => ({
      governor_id: p.governor_id,
      dkp_base: p.column1 * (params.weight_1 as number),
      breakdown: { column1: p.column1 * (params.weight_1 as number) },
    }));
  },
};

registerFormula(myFormula);
```

### Common Issues

| Issue | Solution |
|-------|----------|
| `DB is not defined` after deploy | D1 binding not set. Go to CF Dashboard > Pages > Settings > Bindings |
| Login fails after fresh deploy | Run seed migration: `0002_seed_admin.sql` on remote |
| Wrangler serves old code locally | Kill all node processes, rebuild, restart |
| `adapter-cloudflare` build error | Ensure `pages_build_output_dir` in wrangler.toml matches adapter output |
| TypeScript errors in `.svelte` | Svelte 5 runes require `lang="ts"` in script tag |
| KvK not found | Ensure migrations 0004-0008 have been run |
| Formula not registered | Import the formula file in `src/lib/server/formulas/registry.ts` |
