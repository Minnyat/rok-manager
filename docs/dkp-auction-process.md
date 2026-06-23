# Phác thảo quy trình Đấu giá DKP – MGE

> Trạng thái: **BẢN NHÁP để duyệt**. Tài liệu này chỉ mô tả *quy trình & luật chơi*. Sơ đồ dữ liệu, API và kế hoạch code sẽ làm ở bước sau khi bản nháp này được duyệt.

---

## 0. Mục tiêu & phạm vi

Cho phép một kingdom **đấu giá các suất thứ hạng MGE (rank 1–15)** bằng "điểm đấu giá" (gọi tắt là **xu**) được quy đổi từ điểm **DKP** mà người chơi tích lũy qua các kỳ KvK.

- Chỉ đấu giá **rank 1 đến rank 15**.
- Mỗi rank có **số trọc vàng (sculptures) cố định**.
- Mỗi người chơi chỉ nhận **tối đa 1 suất**.
- **Tại một thời điểm chỉ tồn tại 1 phiên đấu giá** cho mỗi kingdom.
- Mọi thời gian **tính & hiển thị theo UTC**.
- Chỉ dùng **số nguyên** cho mọi giá trị điểm/xu.

---

## 1. Vai trò

| Vai trò | Quyền trong tính năng này |
|--------|----------------------------|
| **Admin (hệ thống)** | Cấu hình **bảng số trọc theo rank** một lần; mọi kingdom dùng chung. |
| **King / R4** | Chốt quy đổi DKP→xu (1 lần/KvK); tạo/mở/đóng phiên; đặt bước giá, giá sàn, thời gian, soft-close; chốt kết quả; hủy & hoàn; điều chỉnh vị trí. |
| **Người chơi (member)** | Xem số dư xu của mình; ra giá cho 1 rank; tăng giá; xem giá ẩn danh ở từng rank. |

---

## 2. Khái niệm cốt lõi

- **DKP**: điểm đóng góp KvK của người chơi (lấy từ điểm cuối kỳ của hệ thống hiện tại).
- **Xu (điểm đấu giá)**: tài sản dùng để đấu giá, quy đổi từ DKP. **Cộng dồn** qua các KvK (có hệ số giữ lại do King đặt).
- **Trọc (trọc vàng / sculptures)**: phần thưởng tương ứng mỗi rank; **số trọc của mỗi rank là cố định**.
- **Đơn giá (xu/trọc)**: con số người chơi **ra giá**. Xếp hạng dựa trên đơn giá.
- **Tổng phải trả** = `đơn giá thực trả × số trọc của rank`.
- **Escrow (giữ tạm)**: khi ra giá, một lượng xu bị khóa tạm để đảm bảo đủ tiền; phần thừa nhả lại khi chốt.
- **Sổ cái (ledger)**: nhật ký bất biến mọi biến động xu. **Số dư = tổng các dòng sổ cái − xu đang giữ tạm ở phiên đang mở**.

---

## 3. Bảng số trọc theo rank (cố định — Admin cấu hình 1 lần)

Giá trị mặc định theo bảng thưởng MGE chuẩn (Admin có thể chỉnh, áp dụng cho mọi kingdom):

| Rank | Số trọc | Rank | Số trọc | Rank | Số trọc |
|-----:|--------:|-----:|--------:|-----:|--------:|
| 1 | 180 | 6 | 30 | 11 | 10 |
| 2 | 90 | 7 | 20 | 12 | 10 |
| 3 | 60 | 8 | 20 | 13 | 10 |
| 4 | 50 | 9 | 20 | 14 | 10 |
| 5 | 40 | 10 | 20 | 15 | 10 |

---

## 4. Tham số cấu hình (ai đặt gì)

| Tham số | Người đặt | Mặc định |
|--------|-----------|----------|
| Bảng số trọc theo rank (1–15) | **Admin** | Theo bảng mục 3 |
| Hệ số quy đổi DKP → xu | **King/R4** | *cần chốt (xem mục 14)* |
| % giữ lại số dư cũ khi quy đổi (carryover) | **King/R4** | 100% |
| Bước giá (increment) | **King/R4** | *cần chốt* |
| Giá sàn (reserve, xu/trọc tối thiểu) | **King/R4** | *cần chốt* |
| Giờ mở / giờ đóng (UTC) | **King/R4** | — |
| Thời lượng gia hạn soft-close (phút) | **King/R4** | 5 |

---

## 5. Cơ chế đấu giá: Generalized Second-Price (GSP)

Đây là cơ chế Google Ads dùng để bán vị trí — phù hợp với "nhiều suất xếp hạng, mỗi suất giá trị khác nhau".

**Quy tắc:**
1. Xếp tất cả người ra giá theo **đơn giá từ cao xuống thấp**. Cao nhất → rank 1, kế tiếp → rank 2, … tối đa tới rank 15.
2. Người **rank i** trả **đơn giá = (đơn giá của người rank i+1) + 1 bước giá**. (Tức trả theo "giá người ngay dưới", không phải giá của chính mình.)
3. Nếu không có người ngay dưới (ví dụ rank 15 mà tổng số người ra giá ≤ 15, hoặc slot không có ai cạnh tranh): trả **giá sàn**.
4. **Tổng phải trả = đơn giá thực trả × số trọc của rank.**
5. Người xếp từ hạng 16 trở đi: **không nhận suất, không mất xu**.

### Ví dụ (bảng: r1=180, r2=90, r3=60 trọc; bước giá = 1)

| Người | Đơn giá đặt | Rank | Đơn giá **thực trả** | Tổng phải trả |
|------|------------:|-----:|---------------------:|--------------:|
| An | 10 | 1 | 7 + 1 = **8** | 8 × 180 = **1440** |
| Bình | 7 | 2 | 5 + 1 = **6** | 6 × 90 = **540** |
| Cường | 5 | 3 | (giá sàn nếu Dũng không tính) … | … |
| Dũng | 3 | — | — | 0 |

> An đặt 10 nhưng **chỉ trả đơn giá 8** → không trả hớ. Đây là tính chất cốt lõi giúp người chơi yên tâm "cứ ra đúng mức tối đa thật lòng".

---

## 6. Vòng đời một phiên đấu giá

```
[Admin cấu hình bảng trọc] (1 lần, dùng chung)
        │
[King/R4 chốt quy đổi DKP → xu]  ── 1 lần/KvK, cộng dồn theo % giữ lại
        │
[King/R4 tạo phiên: rank 1–15, bước giá, giá sàn, giờ mở/đóng UTC, soft-close]
        │
   ┌──► OPEN ──► (người chơi ra giá, chỉ tăng) ──► soft-close gia hạn nếu sát giờ
   │                                                      │
   │                                                   CLOSED
   │                                                      │
   │                                         [Hệ thống tính rank + GSP]
   │                                                      │
   │                                   [King/R4 chốt kết quả] ── trừ xu, lưu vị trí
   │                                                      │
   │                         ┌────────────────────────────┼─────────────────────┐
   │                    [Hủy & hoàn]               [Điều chỉnh +/−]       [Công khai danh tính + giá]
   │                  (kèm lý do, log)          (trừ/hoàn chênh lệch)
   └─ (chỉ 1 phiên tồn tại tại một thời điểm)
```

### 6.1 — Admin cấu hình bảng trọc
Làm một lần. Mọi kingdom dùng chung bảng số trọc rank 1–15.

### 6.2 — King/R4 chốt quy đổi DKP → xu (1 lần mỗi KvK)
- King/R4 nhập **hệ số quy đổi** và **% giữ lại** rồi xác nhận.
- Công thức: `Số dư mới = floor(Số dư cũ × %giữ lại) + floor(DKP × hệ số)`.
  - `%giữ lại = 100` (mặc định) ⇒ giữ nguyên toàn bộ xu cũ rồi cộng thêm phần mới.
  - `%giữ lại < 100` ⇒ phần bị cắt được ghi một dòng sổ cái `decay` (vẫn truy vết được).
- **Chỉ được chốt 1 lần cho mỗi KvK** (chặn chốt trùng).
- Số xu chưa dùng từ các KvK trước **tự động cộng dồn** (vì sổ cái không reset).

### 6.3 — King/R4 tạo & mở phiên
- Đặt: danh sách rank đấu giá (mặc định 1–15), **bước giá**, **giá sàn**, **giờ mở/đóng (UTC)**, **soft-close (phút, mặc định 5)**.
- Hệ thống chặn nếu kingdom **đang có 1 phiên chưa kết thúc**.

### 6.4 — Người chơi ra giá
- Nhập **một đơn giá** duy nhất. **Rank tự suy ra** từ thứ tự đơn giá (không chọn rank trực tiếp): đơn giá cao hơn ⇒ rank tốt hơn.
- **Luật bid:**
  - **Một người chỉ giữ 1 suất** ⇒ chỉ có **1 bid đang hoạt động**.
  - **Đã ra giá thì chỉ được TĂNG, không được giảm.** Muốn lên rank cao hơn thì nâng đơn giá.
  - Ràng buộc ngân sách: `đơn giá × số trọc của rank tạm thời ≤ số dư xu`. Hệ thống **giữ tạm (escrow)** đúng lượng này.
- Mỗi lần tăng giá là một bản ghi mới (giữ lịch sử để minh bạch).

### 6.5 — Hiển thị trong lúc đấu (ẩn danh)
- Hiện **đơn giá đang chốt ở từng rank** để người chơi biết "muốn lên rank X phải vượt giá nào".
- **KHÔNG hiện danh tính**, **KHÔNG hiện số dư xu của người khác**.

### 6.6 — Soft-close (chống canh giây cuối)
- Nếu có người **vươn lên đổi thứ hạng** trong N phút cuối (N do King đặt, mặc định 5), **giờ đóng tự lùi thêm N phút**.
- Tác dụng kép: công bằng + **dàn mỏng đám đông lúc 24:00 UTC**.

### 6.7 — Đóng phiên & tính kết quả
- Khi hết giờ (kể cả sau các lần gia hạn), phiên chuyển **CLOSED**.
- Hệ thống **sắp xếp các bid, gán rank 1–15, tính đơn giá thực trả theo GSP và tổng phải trả** (chạy 1 lần, tất định).

### 6.8 — King/R4 chốt kết quả
- King/R4 xem bảng kết quả rồi **xác nhận chốt**.
- Khi chốt: **trừ xu** (ghi sổ cái `charge`), **lưu vị trí** của từng người. Người không trúng được **nhả escrow** về số dư.

### 6.9 — Hủy & hoàn (khi kingdom không giữ được vị trí)
- King/R4 có thể **hủy kết quả của một/nhiều người** và **hoàn lại toàn bộ xu** (ghi sổ cái `refund`).
- **Bắt buộc nhập lý do.** Việc hoàn được **ghi log và công khai**.

### 6.10 — Điều chỉnh vị trí (+/−)
- King/R4 có thể **nâng** hoặc **hạ** rank của một người sau khi chốt.
- **Nâng rank** (nhiều trọc hơn) → **trừ thêm** phần chênh lệch.
- **Hạ rank** (ít trọc hơn) → **hoàn lại** phần chênh lệch.
- Ghi sổ cái `adjust` (có dấu) + **bắt buộc lý do**, công khai.

### 6.11 — Công khai sau khi đóng
- Sau khi đóng phiên: **công khai danh tính + toàn bộ đơn giá + công thức tính** để ai cũng kiểm chứng được giá thắng.

---

## 7. Vì sao "chỉ được tăng giá" đảm bảo luôn đủ tiền

Đây là điểm tinh tế nhất nhưng được giải tự nhiên:

- Rank cao hơn = nhiều trọc hơn = **tổng tiền đắt hơn**.
- Vì **bid chỉ được tăng**, người **duy nhất** bị đắt thêm là người **chủ động nâng giá** → ta kiểm tra ngân sách **ngay lúc họ nâng**.
- Mọi người **bị đẩy tụt** xuống rank thấp hơn ⇒ **ít trọc hơn ⇒ rẻ hơn ⇒ luôn còn đủ tiền.**

⇒ Không bao giờ có cảnh "bị đẩy lên một rank đắt mà không đủ trả". Hệ thống tự nhất quán về ngân sách.

---

## 8. Minh bạch & chống gian lận

- **Ẩn danh trong lúc đấu** → kẻ phá không biết nhắm vào ai để dìm.
- **Bid không thể giảm/rút** → ra giá ảo cao để phá có nguy cơ **tự thắng và phải trả thật** ⇒ rào cản tự nhiên.
- **Giá sàn + bước giá đủ lớn** → chặn phá bằng các bid lẻ.
- **Sổ cái bất biến + audit log mọi thao tác King/R4** (chốt, hủy, điều chỉnh — kèm lý do) → công khai.
- **Công khai toàn bộ bid + công thức sau khi đóng** → cộng đồng tự kiểm chứng.
- *Lưu ý cơ chế:* GSP về lý thuyết có điểm yếu "đặt sát ngay dưới để đẩy giá người trên". Ẩn danh làm việc nhắm mục tiêu khó; nếu sau này cần triệt để công bằng có thể cân nhắc cơ chế **VCG** (khó giải thích hơn). Bản nháp này dùng **GSP**.

---

## 9. Xử lý nghẽn lúc đóng phiên (cao điểm 24:00 UTC)

- **Mỗi lần ra giá là một bản ghi mới (append-only)** — không sửa đè một ô chung ⇒ tránh tranh chấp ghi.
- **Không lưu sẵn "rank"** — rank tính lại bằng cách sắp xếp lúc hiển thị/đóng ⇒ không có bộ đếm để giành nhau.
- **Soft-close** tự dàn mỏng đám đông phút chót.
- **Kiểm tra lạc quan** khi nâng giá (`giá mới > giá cũ` + `đủ tiền`); nếu vừa có người chen vào thì báo "giá đã đổi, thử lại".
- **Chốt kết quả chạy 1 lần sau khi đóng**, tất định, tính lại bao nhiêu lần cũng ra như nhau.

---

## 10. Tiebreak (khi đơn giá bằng nhau)

Thứ tự ưu tiên: **đóng góp KvK (DKP) cao hơn** → **người ra mức giá đó sớm hơn**.

---

## 11. Một số trường hợp biên

- **Ít hơn 15 người ra giá:** các rank dư không có người; rank cuối có người sẽ trả **giá sàn**.
- **Nhiều hơn 15 người:** chỉ top 15 nhận suất; người 16+ nhả escrow, không mất xu.
- **Đổi rank giữa chừng:** dời bid hiện tại sang rank mới (vẫn 1 bid/người); escrow tính lại theo rank mới.
- **King chốt quy đổi 2 lần/KvK:** bị chặn.
- **Hủy/điều chỉnh sau khi đã chốt:** luôn ghi sổ cái + lý do, không bao giờ chỉnh tay số dư trực tiếp.

---

## 12. Audit log ghi gì

Mọi sự kiện ghi: thời điểm (UTC), người thực hiện, hành động, đối tượng, giá trị trước/sau, **lý do** (với hủy/điều chỉnh). Các sự kiện hiển thị công khai sau khi đóng phiên: kết quả, hủy & hoàn, điều chỉnh.

---

## 13. LUẬT NGƯỜI CHƠI (song ngữ)

### 🇻🇳 Tiếng Việt
1. **Tích & cộng dồn:** Bạn tích điểm DKP qua KvK. Xu chưa dùng được cộng dồn sang kỳ sau (theo % giữ lại do King đặt).
2. **Quy đổi:** King/R4 chốt quy đổi DKP → xu **một lần duy nhất mỗi KvK**, không làm lại.
3. **Phạm vi:** Chỉ đấu giá **rank 1–15**. Mỗi rank có số trọc cố định.
4. **Mỗi người nhận tối đa 1 suất.**
5. **Ra giá:** Bạn ra **đơn giá (xu/trọc)**. Tổng phải trả = đơn giá × số trọc của rank.
6. **Chỉ được tăng giá, không được giảm.** Tổng số xu bạn đặt không vượt quá số dư.
7. **Xếp hạng:** Đơn giá cao hơn xếp trên. Hòa giá: ưu tiên DKP cao hơn, rồi ra giá sớm hơn.
8. **Giá thực trả:** Rank i trả theo **giá của người rank i+1 + 1 bước**; rank cuối không có người dưới thì trả **giá sàn**. Bạn không bao giờ trả quá mức mình đặt.
9. **Ẩn danh khi đấu:** Trong lúc đấu chỉ thấy **giá ở từng rank**, không thấy danh tính hay số xu của ai. Danh tính + toàn bộ giá **công khai sau khi đóng phiên**.
10. **Gia hạn phút chót (soft-close):** Có người vượt lên ở phút cuối thì giờ đóng lùi thêm (mặc định 5 phút).
11. **Chốt:** Khi King/R4 chốt, xu bị trừ và vị trí được lưu lại.
12. **Hủy & hoàn:** Nếu kingdom không giữ được vị trí, King/R4 hủy và **hoàn toàn bộ xu**, có ghi rõ lý do (công khai).
13. **Điều chỉnh:** Nâng rank → trừ thêm xu; hạ rank → hoàn lại phần chênh lệch.
14. **Thời gian:** Mọi mốc thời gian theo **UTC**.

### 🇬🇧 English
1. **Earning & carryover:** You accrue DKP across KvK. Unused coins carry over to the next period (by a keep-% set by the King).
2. **Conversion:** King/R4 finalizes the DKP → coin conversion **once per KvK**; it cannot be redone.
3. **Scope:** Only **ranks 1–15** are auctioned. Each rank grants a fixed number of sculptures.
4. **Each player wins at most one slot.**
5. **Bidding:** You bid a **unit price (coins per sculpture)**. Total cost = unit price × the rank's sculptures.
6. **You may only raise your bid, never lower it.** Your committed total cannot exceed your balance.
7. **Ranking:** Higher unit price ranks higher. Ties broken by higher DKP, then earlier bid time.
8. **Price paid:** Rank i pays **the bid of rank i+1 + one increment**; the lowest filled rank with no one below pays the **reserve price**. You never pay more than your own bid.
9. **Anonymous while live:** During the auction you only see the **price at each rank**, never identities or anyone's balance. Identities and all bids are **revealed after close**.
10. **Anti-snipe (soft-close):** A lead change in the final minutes extends the close time (default 5 minutes).
11. **Settlement:** When King/R4 settles, coins are deducted and your position is recorded.
12. **Cancel & refund:** If the kingdom cannot secure your position, King/R4 cancels and **fully refunds** the coins, with a stated reason (public).
13. **Adjustment:** Moving up costs extra coins; moving down refunds the difference.
14. **Time:** All times are in **UTC**.

---

## 14. Điểm cần chốt trước khi lên plan triển khai

1. **Hệ số quy đổi DKP → xu:** 1:1 hay tỉ lệ do King đặt? Lấy từ chỉ số nào của KvK (điểm DKP cuối kỳ)?
2. **Giá trị mặc định** cho **bước giá** và **giá sàn**.
3. **Soft-close:** gia hạn theo từng lần đổi ngôi (lặp lại được) hay chỉ gia hạn một lần?
4. **Đổi rank giữa chừng:** có cho phép không, hay khóa luôn rank đã chọn khi đã ra giá?
5. **Thông báo "bạn vừa bị vượt":** cần báo trong app (và/hoặc email) không?
