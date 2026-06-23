# Kế hoạch triển khai: Đấu giá DKP – MGE

> Trạng thái: **PLAN để duyệt trước khi code.** Dựa trên `docs/dkp-auction-process.md` (đã duyệt).
> Stack: SvelteKit 2 + Svelte 5, Cloudflare D1 (raw SQL qua `getDb(platform)`), i18n key-value (`t(lang, key)`), auth session (`locals.user` có `kingdomId`, `kingdomRole`).

---

## 0. Quyết định đã khóa

| # | Quyết định | Giá trị |
|---|-----------|---------|
| Quy đổi | DKP → xu | **1 : 1** (floor về số nguyên), nguồn = `player_scores.dkp_combined` của version đang active |
| Phạm vi | Rank đấu giá | **1–15** |
| Bảng trọc | Cấu hình | **Admin**, toàn hệ thống, seed sẵn (180/90/60/50/40/30/20×4/10×5) |
| Bước giá / giá sàn | Mặc định | **1 / 1** (King chỉnh được) |
| Soft-close | Hành vi | **Lặp lại**: mỗi lần đổi ngôi ở N phút cuối → lùi đóng thêm N phút (mặc định N=5, King đặt) |
| Mô hình bid | — | **GSP ladder thuần**: mỗi người 1 đơn giá, **chỉ tăng**, rank suy ra từ thứ tự. *Không có thao tác chọn/đổi rank* (giải quyết câu hỏi #4) |
| Thông báo bị vượt | v1 | **In-app** (cờ "bạn đã rớt khỏi top 15 / bị vượt"); email để sau |
| Số học | — | Toàn bộ **số nguyên** |
| Ví/sổ cái | Khóa theo | **(kingdom_id, user_id)** — bid cần đăng nhập; governor lưu kèm để hiển thị |

---

## 1. Sơ đồ dữ liệu — migration `0011_dkp_auction.sql`

```sql
-- 1.1 Bảng số trọc theo rank (toàn hệ thống, Admin chỉnh). Seed mặc định.
CREATE TABLE mge_rank_rewards (
  rank       INTEGER PRIMARY KEY CHECK (rank BETWEEN 1 AND 15),
  sculptures INTEGER NOT NULL CHECK (sculptures >= 0)
);
INSERT INTO mge_rank_rewards (rank, sculptures) VALUES
  (1,180),(2,90),(3,60),(4,50),(5,40),(6,30),
  (7,20),(8,20),(9,20),(10,20),(11,10),(12,10),(13,10),(14,10),(15,10);

-- 1.2 Lần chốt quy đổi DKP -> xu (idempotent 1 lần / KvK / kingdom)
CREATE TABLE dkp_conversions (
  id           INTEGER PRIMARY KEY,
  kingdom_id   INTEGER NOT NULL REFERENCES kingdoms(id),
  kvk_id       INTEGER NOT NULL REFERENCES kvks(id),
  rate         INTEGER NOT NULL DEFAULT 1,      -- 1:1
  keep_pct     INTEGER NOT NULL DEFAULT 100,    -- % giữ lại số dư cũ
  converted_by INTEGER REFERENCES users(id),
  converted_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (kingdom_id, kvk_id)
);

-- 1.3 Sổ cái bất biến. Số dư = SUM(amount). amount có dấu.
CREATE TABLE dkp_ledger (
  id          INTEGER PRIMARY KEY,
  kingdom_id  INTEGER NOT NULL REFERENCES kingdoms(id),
  user_id     INTEGER NOT NULL REFERENCES users(id),
  governor_id INTEGER,                          -- để hiển thị
  kvk_id      INTEGER REFERENCES kvks(id),
  entry_type  TEXT NOT NULL,                    -- grant|decay|charge|refund|adjust
  amount      INTEGER NOT NULL,
  auction_id  INTEGER REFERENCES auctions(id),
  result_id   INTEGER REFERENCES auction_results(id),
  reason      TEXT,                             -- bắt buộc với refund/adjust
  created_by  INTEGER REFERENCES users(id),
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX ix_ledger_wallet ON dkp_ledger(kingdom_id, user_id);
-- chặn grant/decay trùng cho cùng (kvk, user)
CREATE UNIQUE INDEX ux_ledger_grant ON dkp_ledger(kvk_id, user_id) WHERE entry_type='grant';
CREATE UNIQUE INDEX ux_ledger_decay ON dkp_ledger(kvk_id, user_id) WHERE entry_type='decay';

-- 1.4 Phiên đấu giá. Mỗi kingdom chỉ 1 phiên "sống" tại một thời điểm.
CREATE TABLE auctions (
  id                 INTEGER PRIMARY KEY,
  kingdom_id         INTEGER NOT NULL REFERENCES kingdoms(id),
  kvk_id             INTEGER NOT NULL REFERENCES kvks(id),
  title              TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'draft',   -- draft|open|closed|settled|cancelled
  increment          INTEGER NOT NULL DEFAULT 1 CHECK (increment >= 1),
  reserve            INTEGER NOT NULL DEFAULT 1 CHECK (reserve  >= 0),
  max_rank           INTEGER NOT NULL DEFAULT 15,
  opens_at           INTEGER NOT NULL,               -- UTC epoch
  closes_at          INTEGER NOT NULL,               -- UTC epoch (đã tính gia hạn)
  original_closes_at INTEGER NOT NULL,
  soft_close_minutes INTEGER NOT NULL DEFAULT 5,
  created_by         INTEGER REFERENCES users(id),
  settled_by         INTEGER REFERENCES users(id),
  settled_at         INTEGER,
  created_at         INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at         INTEGER NOT NULL DEFAULT (unixepoch())
);
-- 1 phiên sống / kingdom
CREATE UNIQUE INDEX ux_one_live_auction ON auctions(kingdom_id)
  WHERE status IN ('draft','open','closed');

-- 1.5 Bid: append-only (mỗi lần tăng giá = 1 dòng). Đơn giá hiện tại = dòng mới nhất.
CREATE TABLE auction_bids (
  id          INTEGER PRIMARY KEY,
  auction_id  INTEGER NOT NULL REFERENCES auctions(id),
  user_id     INTEGER NOT NULL REFERENCES users(id),
  governor_id INTEGER,
  unit_price  INTEGER NOT NULL CHECK (unit_price > 0),
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX ix_bids_auction ON auction_bids(auction_id, user_id, id);

-- 1.6 Kết quả sau khi chốt. Hủy/điều chỉnh cập nhật ở đây + ghi sổ cái.
CREATE TABLE auction_results (
  id          INTEGER PRIMARY KEY,
  auction_id  INTEGER NOT NULL REFERENCES auctions(id),
  user_id     INTEGER NOT NULL REFERENCES users(id),
  governor_id INTEGER,
  rank        INTEGER NOT NULL,
  sculptures  INTEGER NOT NULL,
  unit_paid   INTEGER NOT NULL,
  total_cost  INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active',   -- active|cancelled
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (auction_id, user_id)
);

-- 1.7 Nhật ký thao tác King/R4 (công khai sau khi đóng).
CREATE TABLE auction_audit_log (
  id                INTEGER PRIMARY KEY,
  auction_id        INTEGER REFERENCES auctions(id),
  kingdom_id        INTEGER NOT NULL,
  actor_user_id     INTEGER REFERENCES users(id),
  action            TEXT NOT NULL,   -- convert|create|open|close|settle|cancel_result|adjust_result
  target_user_id    INTEGER,
  detail_json       TEXT,            -- {before, after}
  reason            TEXT,
  created_at        INTEGER NOT NULL DEFAULT (unixepoch())
);
```

---

## 2. Module server

### 2.1 `src/lib/server/dkp.ts` — ví & quy đổi
```ts
getBalance(db, kingdomId, userId): Promise<number>
// = SUM(dkp_ledger.amount) cho (kingdomId, userId)

getAvailable(db, kingdomId, userId, auctionId): Promise<number>
// = getBalance − escrow đang giữ ở phiên đang mở (mục 3.2)

getWalletsForKingdom(db, kingdomId): Promise<Wallet[]>  // bảng số dư mọi thành viên

convertDkpToCoins(db, kingdomId, kvkId, { keepPct }, actor): Promise<{ granted, members }>
// Idempotent qua UNIQUE(dkp_conversions.kingdom_id,kvk_id) + ux_ledger_grant
// Với mỗi kingdom_member:
//   old = getBalance(...)
//   kept = floor(old * keepPct / 100);  decayAmt = old - kept
//   dkp  = dkp_combined của governor trong active version (floor)
//   grant = dkp * rate(=1)
//   batch: nếu decayAmt>0 -> ledger 'decay' (-decayAmt); ledger 'grant' (+grant)
//   ghi 1 dòng dkp_conversions + audit 'convert'
```

### 2.2 `src/lib/server/auction.ts` — vòng đời phiên
```ts
createAuction(db, kingdomId, kvkId, cfg, actor)         // chặn nếu đã có phiên sống
openAuction / closeAuctionIfDue                          // chuyển trạng thái theo giờ UTC
getCurrentBids(db, auctionId): Map<userId, {unit_price, created_at}>  // dòng mới nhất/người
rankBids(currentBids, tiebreakData): Ranked[]            // sort desc (mục 3.1)
placeBid(db, auctionId, userId, unitPrice): result       // luật bid + escrow + soft-close (mục 3.3)
computeResults(db, auctionId): ResultRow[]               // GSP, KHÔNG động tiền (mục 3.4)
confirmSettlement(db, auctionId, actor)                  // ghi results + ledger 'charge' + audit
cancelResult(db, resultId, reason, actor)                // ledger 'refund' + reason + audit
adjustResult(db, resultId, newRank, reason, actor)       // ledger 'adjust' (±) + audit
getPublicReveal(db, auctionId)                           // danh tính + toàn bộ bid (sau khi đóng)
```

---

## 3. Thuật toán then chốt

### 3.1 Xếp hạng
Sort các đơn giá hiện tại **giảm dần**; hòa giá → **DKP cao hơn** → **đạt mức giá đó sớm hơn** (created_at nhỏ hơn). Vị trí thứ i (0-based) ⇒ rank = i+1. Chỉ rank ≤ `max_rank` (15) là trúng.

### 3.2 Escrow (giữ tạm) khi phiên đang mở
Với mỗi người có bid:
```
provRank   = vị trí trong rankBids()
hold       = (provRank ≤ 15) ? unit_price × sculptures[provRank] : 0
available  = getBalance − hold
```
> Vì đơn giá thực trả ≤ đơn giá đặt, `hold` là cận trên an toàn; phần dư nhả khi chốt.

### 3.3 `placeBid` — luật + an toàn
```
1. Guard: phiên status='open' và now < closes_at.
2. cur = đơn giá hiện tại của user (nếu có). Bắt buộc unitPrice ≥ (cur ?? reserve) + (cur ? increment : 0).
   -> "chỉ được tăng": unitPrice phải > cur.
3. Tính provRank mới nếu đặt unitPrice (so với current bids).
4. Affordability: unitPrice × sculptures[provRank≤15 ? provRank : (chi phí 0)] ≤ getBalance.
   (so với getBalance vì bid mới thay thế hold cũ của chính user)
5. INSERT 1 dòng auction_bids (append-only).
6. Soft-close: nếu việc này làm user đổi ngôi (lọt/leo trong top 15) và (closes_at - now) ≤ soft_close_minutes
   -> closes_at = now + soft_close_minutes*60  (lặp lại được).
7. Optimistic: bọc 4–6 với kiểm tra lại; nếu state đã đổi -> trả "giá đã đổi, thử lại".
```

### 3.4 `computeResults` — GSP (không động tiền)
```
ranked = rankBids(getCurrentBids())
N = min(len(ranked), 15)
for i in 0..N-1:
   rank       = i+1
   sculptures = mge_rank_rewards[rank]
   below      = (i+1 < len(ranked)) ? ranked[i+1].unit_price : reserve
   unitPaid   = clamp( below + increment, reserve, ranked[i].unit_price )  // ≤ giá mình đặt
   total      = unitPaid × sculptures
   push {user, rank, sculptures, unitPaid, total}
```
`confirmSettlement` ghi `auction_results` + mỗi người 1 dòng ledger `charge (-total)`, set `status='settled'`, audit `settle`. Người ngoài top 15 không có result, escrow tự nhả.

### 3.5 Hủy & điều chỉnh
- **cancelResult:** result→`cancelled`; ledger `refund (+total_cost)`; **reason bắt buộc**; audit.
- **adjustResult(newRank):** tính `total_new` theo `unit_paid` hiện tại × sculptures[newRank] (hoặc theo quy tắc King chọn); `delta = total_new − total_cost`; ledger `adjust (−delta)` (delta>0 trừ thêm, delta<0 hoàn lại); cập nhật result; **reason bắt buộc**; audit.

---

## 4. Quyền & ràng buộc

| Hành động | Ai | Kiểm tra |
|----------|-----|----------|
| Sửa bảng trọc | Admin | `isAdmin` |
| Quy đổi DKP, tạo/mở/đóng/chốt/hủy/điều chỉnh | King/R4 | `isKingdomManager(user, kingdomId)` |
| Ra giá | Member của kingdom | `locals.user.kingdomId === auction.kingdom_id` |
| Xem giá ẩn danh | Member | như trên |
| Xem reveal | Member | chỉ sau khi `status ∈ {closed,settled}` |

Mọi action server: validate số nguyên, guard trạng thái phiên, chống vượt số dư, dùng `t(locals.lang, key)` cho lỗi.

---

## 5. Giao diện

### 5.1 Admin King/R4 — `src/routes/admin/auction/` (cấp KINGDOM, không thuộc KvK)
> Đấu giá là hoạt động cấp kingdom; `auctions.kvk_id` chỉ là tham chiếu **tùy chọn** (nullable) cho tiebreak DKP, tự gán = KvK mới nhất của kingdom.
- **Panel quy đổi:** **dropdown chọn KvK** + input %giữ lại (mặc định 100) → "Chốt quy đổi DKP→xu" 1:1; KvK đã quy đổi bị chặn/đánh dấu ✓.
- **Tạo/mở phiên:** form bước giá, giá sàn, giờ mở/đóng (nhập & hiển thị **UTC**), soft-close phút.
- **Bảng theo dõi trực tiếp:** King/R4 thấy đầy đủ (rank, đơn giá, người) để điều hành.
- **Chốt kết quả:** xem bảng `computeResults` → nút "Chốt" → ghi ledger.
- **Mỗi dòng kết quả:** nút Hủy (popup lý do) / Điều chỉnh +/− (popup rank mới + lý do).
- **Nhật ký + ví thành viên.**

### 5.1b Admin hệ thống — `src/routes/admin/mge-rewards/`
- Sửa **bảng số trọc theo rank 1–15** (toàn hệ thống, mọi kingdom dùng chung). Chỉ system-admin.

### 5.2 Người chơi — `src/routes/auction/` (member)
- **Số dư xu** của tôi (getAvailable).
- **Bảng rank 1–15:** số trọc + **đơn giá đang chốt (ẩn danh)** + "giá tối thiểu để chiếm rank này" + **rank tạm thời & tổng chi phí dự kiến của tôi**.
- **Form ra giá:** nhập đơn giá (chỉ tăng), xem trước chi phí & rank dự kiến; chặn nếu vượt số dư.
- **Cờ "bạn vừa bị vượt / rớt khỏi top 15".**
- **Sau khi đóng:** bảng reveal (danh tính + toàn bộ giá + công thức).
- Hiển thị **mọi mốc giờ theo UTC** (kèm đồng hồ đếm ngược tới `closes_at`).

---

## 6. i18n
Thêm namespace `auction.*` (và `dkp.*`) vào cả `vi` lẫn `en` trong `src/lib/i18n.ts`: nhãn cột, nút, thông báo lỗi, và **toàn văn luật song ngữ** (mục 13 của tài liệu quy trình) dưới các key `auction.rules.*`.

---

## 7. Đồng thời & nghẽn lúc đóng (24:00 UTC)
- Bid = INSERT (append-only), không sửa đè hot-row.
- Rank/escrow tính lúc đọc, không lưu sẵn.
- `placeBid` dùng kiểm tra lạc quan; xung đột → "thử lại".
- Soft-close lặp lại tự dàn mỏng phút chót.
- `confirmSettlement` chạy 1 lần sau khi đóng, tất định, idempotent (guard `status`).

---

## 8. Trường hợp biên (đã liệt kê ở tài liệu quy trình)
Ít/nhiều hơn 15 người; chốt quy đổi 2 lần (chặn); hủy/điều chỉnh sau chốt (luôn qua sổ cái); member chưa có score (grant 0); đổi active version sau khi đã quy đổi (không ảnh hưởng ví).

---

## 9. Kiểm thử
- **Unit:** `rankBids` (kể cả hòa giá), `computeResults` GSP (ví dụ ở tài liệu quy trình phải khớp), escrow, `convertDkpToCoins` idempotent, carryover `keepPct<100`.
- **Tích hợp:** luồng đầy đủ mở→bid (raise-only, vượt số dư bị chặn)→soft-close→đóng→chốt→hủy/điều chỉnh; kiểm `SUM(ledger)` luôn khớp.
- **Thủ công:** seed 1 kingdom + vài member, chạy 1 phiên mẫu, đối chiếu reveal.

---

## 10. Triển khai
- Áp migration D1 (`wrangler d1 ... 0011_dkp_auction.sql`).
- Link tài liệu vào README/nav.
- (Tùy chọn) cờ bật/tắt tính năng theo kingdom.

---

## 11. Checklist theo giai đoạn
- [ ] **P0** Migration `0011_dkp_auction.sql` + seed bảng trọc.
- [ ] **P1** `dkp.ts` (balance/available/convert) + unit test.
- [ ] **P2** `auction.ts` (rank/escrow/placeBid/computeResults/confirm/cancel/adjust) + unit test.
- [ ] **P3** Trang Admin (quy đổi, tạo/mở/chốt/hủy/điều chỉnh, audit).
- [ ] **P4** Trang người chơi (số dư, bảng ẩn danh, ra giá, reveal, đồng hồ UTC).
- [ ] **P5** i18n `auction.*` + luật song ngữ.
- [ ] **P6** Quyền & guard trạng thái toàn bộ action.
- [ ] **P7** Kiểm thử + áp migration + tài liệu.

---

## 12. Sai khác cần đồng bộ với tài liệu quy trình
- §6.4: bỏ ý "chọn 1 rank rồi đổi rank". Mô hình đúng: **một đơn giá, rank tự suy ra, chỉ tăng giá**. (Sẽ cập nhật lại `dkp-auction-process.md` khi bạn duyệt plan này.)
```
