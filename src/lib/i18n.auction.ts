/**
 * Translations for the MGE DKP auction feature. Merged into the main
 * translation tables in i18n.ts (kept separate to avoid editing the large
 * literal there). Keys live under the `auction.*` namespace.
 */

export const auctionVi: Record<string, string> = {
	"nav.auction": "Đấu giá",
	"auction.tab": "Đấu giá",
	"auction.adminTab": "Trọc MGE",
	"auction.admin.title": "Bảng số trọc theo rank (MGE)",
	"auction.admin.hint": "Cấu hình toàn hệ thống — mọi kingdom dùng chung. Số trọc mỗi rank 1–15.",
	"auction.admin.err": "Số trọc phải là số nguyên ≥ 0",
	"err.forbidden": "Bạn không có quyền thực hiện thao tác này",

	"auction.title": "Đấu giá DKP — MGE",
	"auction.none": "Hiện chưa có phiên đấu giá nào.",
	"auction.balance": "Số dư xu",
	"auction.coins": "xu",
	"auction.available": "Khả dụng",
	"auction.you": "bạn",
	"auction.yourBid": "Giá của bạn",
	"auction.outbid": "Bạn đã bị vượt — hiện không nằm trong nhóm trúng. Hãy nâng giá nếu muốn.",
	"auction.noBids": "Chưa có ai ra giá.",
	"auction.opensAt": "Mở",
	"auction.closesAt": "Đóng",
	"auction.closeNow": "Đóng phiên ngay",
	"auction.settle": "Chốt kết quả",
	"auction.settleHint": "Chốt sẽ trừ xu của người thắng và lưu lại vị trí.",
	"auction.adjust": "Điều chỉnh",
	"auction.cancel": "Hủy",
	"auction.newRank": "Rank mới",
	"auction.reason": "Lý do",
	"auction.cancelReason": "Lý do hủy (công khai)",
	"auction.confirmCancel": "Xác nhận hủy & hoàn xu",

	"auction.status.draft": "Đã lên lịch",
	"auction.status.open": "Đang mở",
	"auction.status.closed": "Đã đóng",
	"auction.status.settled": "Đã chốt",
	"auction.status.cancelled": "Đã hủy",
	"auction.rstatus.active": "Hiệu lực",
	"auction.rstatus.cancelled": "Đã hủy",

	"auction.col.rank": "Rank",
	"auction.col.player": "Người chơi",
	"auction.col.unitPrice": "Đơn giá",
	"auction.col.sculptures": "Số trọc",
	"auction.col.willPay": "Dự kiến trả",
	"auction.col.paid": "Đã trả",
	"auction.col.status": "Trạng thái",
	"auction.col.actions": "Thao tác",
	"auction.col.currentPrice": "Giá hiện tại",
	"auction.col.minToClaim": "Giá tối thiểu để chiếm",
	"auction.col.bid": "Đơn giá đặt",

	"auction.convert.title": "Quy đổi DKP → xu",
	"auction.convert.done": "Đã quy đổi ({date}, giữ lại {keep}%). Không thể quy đổi lại cho KvK này.",
	"auction.convert.hint": "Quy đổi 1:1 từ DKP cuối kỳ. Chỉ làm được MỘT lần cho mỗi KvK.",
	"auction.convert.keepPct": "% giữ lại số dư cũ",
	"auction.convert.submit": "Chốt quy đổi",
	"auction.convert.pickKvk": "Chọn KvK để quy đổi",
	"auction.convert.alreadyList": "Đã quy đổi",
	"auction.admin.kingdomOnly": "Đấu giá thuộc cấp kingdom. Hãy đăng nhập bằng tài khoản King/R4 của kingdom để điều hành.",
	"auction.coin.title": "Cài đặt & trạng thái xu",
	"auction.coin.autoNote": "Xu được TỰ ĐỘNG chốt khi King/R4 đóng một KvK (quy đổi 1:1 từ DKP). Không quy đổi thủ công ở đây.",
	"auction.coin.keepPct": "% giữ lại số dư cũ (mặc định 100)",
	"auction.coin.kvkStatus": "Trạng thái quy đổi theo KvK",
	"auction.coin.converted": "Đã chốt xu",
	"auction.coin.notConverted": "Chưa đóng",
	"auction.coin.keepInfo": "% giữ lại số dư cũ: {keep}% (chỉnh trong Cấu hình Kingdom).",
	"kd2.coinKeepPct": "% giữ lại xu",
	"kd2.coinKeepHint": "Khi đóng KvK, xu được chốt: số dư mới = điểm mới + (số dư cũ × % giữ lại). Mặc định 100% (giữ toàn bộ).",
	"kdcfg.tab": "Cấu hình KD",
	"kdcfg.title": "Cấu hình Kingdom",
	"kdcfg.kingdomLabel": "Kingdom",
	"kdcfg.adminNote": "Bạn là admin hệ thống — quản lý từng kingdom tại mục Kingdoms.",
	"kvko.closeTitle": "Đóng KvK",
	"kvko.closeDesc": "Đóng KvK sẽ tự động chốt DKP → xu (giữ lại {keep}% số dư cũ) và KHÔNG thể mở lại.",
	"kvko.closeBtn": "Đóng KvK",
	"kvko.closeWarn": "Hành động này không thể hoàn tác. KvK sẽ bị đóng vĩnh viễn và xu được chốt ngay lập tức.",
	"kvko.closeConfirm": "Xác nhận đóng KvK",
	"kvko.closedTitle": "KvK đã đóng",
	"kvko.closedDesc": "KvK này đã được đóng. Không thể mở lại.",
	"kvko.convertedInfo": "Đã chốt xu lúc {date} (giữ lại {keep}%).",
	"kvko.closedMsg": "Đã đóng KvK. Đã chốt {granted} xu cho {members} thành viên (giữ lại {keep}%).",
	"kvko.err.alreadyClosed": "KvK này đã đóng rồi",

	"auction.create.title": "Tạo phiên đấu giá",
	"auction.create.name": "Tên phiên",
	"auction.create.opensAt": "Giờ mở (UTC)",
	"auction.create.closesAt": "Giờ đóng (UTC)",
	"auction.create.increment": "Bước giá",
	"auction.create.reserve": "Giá sàn",
	"auction.create.softClose": "Gia hạn phút chót (phút)",
	"auction.create.utcNote": "Mọi mốc thời gian theo UTC. Đấu giá rank 1–15. Tại một thời điểm chỉ có 1 phiên.",
	"auction.create.submit": "Tạo phiên",

	"auction.results.title": "Kết quả đã chốt",
	"auction.wallets.title": "Số dư xu thành viên",
	"auction.audit.title": "Nhật ký thao tác",
	"auction.action.convert": "Quy đổi DKP",
	"auction.action.create": "Tạo phiên",
	"auction.action.open": "Mở phiên",
	"auction.action.close": "Đóng phiên",
	"auction.action.settle": "Chốt kết quả",
	"auction.action.cancel_result": "Hủy & hoàn",
	"auction.action.adjust_result": "Điều chỉnh vị trí",

	"auction.bid.title": "Ra giá",
	"auction.bid.hint": "Đơn giá tối thiểu: {min}. Tổng phải trả = đơn giá × số trọc của rank bạn đạt.",
	"auction.bid.unitPrice": "Đơn giá (xu/trọc)",
	"auction.bid.submit": "Đặt giá",
	"auction.bid.raiseOnly": "Đã ra giá thì chỉ được tăng, không được giảm.",

	"auction.ladder.title": "Bảng rank (ẩn danh)",
	"auction.reveal.title": "Kết quả công khai",
	"auction.rules.title": "Luật đấu giá",
	"auction.rules.body":
		"Tóm tắt: Bạn dùng XU (đổi từ DKP) để giành 1 suất rank MGE (1–15). Gõ giá càng cao, rank càng tốt, càng nhiều trọc. Yên tâm 2 điều: chỉ mất xu KHI TRÚNG, và không bao giờ trả nhiều hơn mức bạn gõ.\n" +
		"\n" +
		"— XU CỦA BẠN —\n" +
		"1. Bạn tích DKP qua mỗi KvK. King/R4 đổi DKP → xu, 1 lần duy nhất mỗi KvK (mặc định 1:1).\n" +
		"2. Xu chưa dùng được cộng dồn sang kỳ sau.\n" +
		"\n" +
		"— CÁCH RA GIÁ —\n" +
		"3. Bạn gõ ĐƠN GIÁ = số xu cho mỗi trọc. Bạn KHÔNG chọn rank trực tiếp — hệ thống tự xếp theo đơn giá: gõ càng cao, rank càng tốt.\n" +
		"4. Mỗi người chỉ giữ 1 suất. Đã ra giá thì CHỈ ĐƯỢC TĂNG, không được giảm, và không vượt quá số dư xu.\n" +
		"   (Vì sao chỉ tăng: rank cao hơn tốn nhiều xu hơn, nên hệ thống kiểm tra đủ tiền ngay lúc bạn nâng. Bị người khác đẩy tụt xuống thì luôn rẻ hơn — bạn không bao giờ kẹt tiền.)\n" +
		"\n" +
		"— BẠN TRẢ BAO NHIÊU —\n" +
		"5. Xếp hạng: đơn giá cao hơn xếp trên. Bằng nhau: ưu tiên DKP cao hơn, rồi ai gõ sớm hơn.\n" +
		"6. Bạn trả theo giá của NGƯỜI NGAY DƯỚI bạn (+1 bước), KHÔNG phải giá bạn gõ. Người chót, không còn ai dưới, thì trả giá sàn.\n" +
		"   Ví dụ: bạn gõ 10, người dưới bạn gõ 7 → bạn chỉ trả đơn giá 8. Cứ gõ đúng mức tối đa thật lòng, không sợ trả hớ.\n" +
		"7. Tổng xu phải trả = đơn giá thực trả × số trọc của rank. Rank càng cao càng nhiều trọc, nên càng đắt.\n" +
		"8. Xếp từ hạng 16 trở đi: không nhận suất, không mất xu.\n" +
		"\n" +
		"— AN TÂM & MINH BẠCH —\n" +
		"9. Trong lúc đấu là ẨN DANH: bạn chỉ thấy giá ở từng rank, không thấy ai là ai hay ai có bao nhiêu xu. Đóng phiên xong mới công khai danh tính + toàn bộ giá để ai cũng kiểm chứng được.\n" +
		"10. Gia hạn phút chót: có người vượt lên ở những phút cuối thì giờ đóng tự lùi thêm — bạn luôn có cơ hội đáp trả, không sợ bị canh giây cuối.\n" +
		"\n" +
		"— SAU KHI ĐÓNG (King/R4 làm) —\n" +
		"11. Chốt: trừ xu người trúng và lưu vị trí. Người không trúng được nhả lại toàn bộ xu giữ tạm.\n" +
		"12. Hủy & hoàn: nếu kingdom không giữ được suất, hoàn lại TOÀN BỘ xu kèm lý do công khai.\n" +
		"13. Điều chỉnh: nâng rank trừ thêm xu, hạ rank hoàn lại phần chênh.\n" +
		"\n" +
		"Mọi thời gian tính theo giờ UTC.",

	"auction.liveUpdated": "Cập nhật lúc {time}",
	"auction.refresh": "Làm mới",

	"auction.msg.converted": "Đã quy đổi: cấp {granted} xu cho {members} thành viên.",
	"auction.msg.saved": "Đã lưu.",
	"auction.msg.bidRank": "Đã đặt giá — rank tạm thời {rank}, chi phí dự kiến {cost} xu.",
	"auction.msg.bidNoSlot": "Đã đặt giá, nhưng hiện chưa lọt vào nhóm trúng (rank 1–15).",
	"auction.msg.extended": "Giờ đóng được gia hạn (phút chót).",

	"auction.err.keepPct": "% giữ lại phải từ 0 đến 100",
	"auction.err.pickKvk": "Vui lòng chọn KvK để quy đổi",
	"auction.err.alreadyConverted": "KvK này đã quy đổi DKP rồi",
	"auction.err.title": "Vui lòng nhập tên phiên",
	"auction.err.times": "Giờ mở/đóng không hợp lệ",
	"auction.err.notFound": "Không tìm thấy phiên/kết quả",
	"auction.err.reason": "Vui lòng nhập lý do",
	"auction.err.noKingdom": "Bạn chưa thuộc kingdom nào",
	"auction.err.notOpen": "Phiên đấu giá hiện không mở",
	"auction.err.invalidBid": "Đơn giá không hợp lệ",
	"auction.err.closed": "Phiên đã đóng",
	"auction.err.tooLow": "Đơn giá quá thấp — tối thiểu {min}",
	"auction.err.insufficient": "Không đủ xu — cần {needed}, bạn có {balance}",

	"auction.export": "Xuất CSV",
};

export const auctionEn: Record<string, string> = {
	"nav.auction": "Auction",
	"auction.tab": "Auction",
	"auction.adminTab": "MGE Rewards",
	"auction.admin.title": "MGE rank reward table",
	"auction.admin.hint": "System-wide config — shared by every kingdom. Sculptures per rank 1–15.",
	"auction.admin.err": "Sculptures must be an integer ≥ 0",
	"err.forbidden": "You are not allowed to perform this action",

	"auction.title": "DKP Auction — MGE",
	"auction.none": "There is no auction right now.",
	"auction.balance": "Coin balance",
	"auction.coins": "coins",
	"auction.available": "Available",
	"auction.you": "you",
	"auction.yourBid": "Your bid",
	"auction.outbid": "You have been outbid — currently outside the winning set. Raise your bid if you want it.",
	"auction.noBids": "No bids yet.",
	"auction.opensAt": "Opens",
	"auction.closesAt": "Closes",
	"auction.closeNow": "Close now",
	"auction.settle": "Settle results",
	"auction.settleHint": "Settling deducts winners' coins and records their positions.",
	"auction.adjust": "Adjust",
	"auction.cancel": "Cancel",
	"auction.newRank": "New rank",
	"auction.reason": "Reason",
	"auction.cancelReason": "Cancel reason (public)",
	"auction.confirmCancel": "Confirm cancel & refund",

	"auction.status.draft": "Scheduled",
	"auction.status.open": "Open",
	"auction.status.closed": "Closed",
	"auction.status.settled": "Settled",
	"auction.status.cancelled": "Cancelled",
	"auction.rstatus.active": "Active",
	"auction.rstatus.cancelled": "Cancelled",

	"auction.col.rank": "Rank",
	"auction.col.player": "Player",
	"auction.col.unitPrice": "Unit price",
	"auction.col.sculptures": "Sculptures",
	"auction.col.willPay": "Will pay",
	"auction.col.paid": "Paid",
	"auction.col.status": "Status",
	"auction.col.actions": "Actions",
	"auction.col.currentPrice": "Current price",
	"auction.col.minToClaim": "Min to claim",
	"auction.col.bid": "Bid",

	"auction.convert.title": "Convert DKP → coins",
	"auction.convert.done": "Converted ({date}, kept {keep}%). Cannot convert again for this KvK.",
	"auction.convert.hint": "1:1 from final KvK DKP. Can only be done ONCE per KvK.",
	"auction.convert.keepPct": "Keep % of old balance",
	"auction.convert.submit": "Finalize conversion",
	"auction.convert.pickKvk": "Pick a KvK to convert",
	"auction.convert.alreadyList": "Already converted",
	"auction.admin.kingdomOnly": "Auctions are kingdom-level. Sign in as the kingdom's King/R4 to operate one.",
	"auction.coin.title": "Coin settings & status",
	"auction.coin.autoNote": "Coins are finalized AUTOMATICALLY when a King/R4 closes a KvK (1:1 from DKP). No manual conversion here.",
	"auction.coin.keepPct": "Keep % of old balance (default 100)",
	"auction.coin.kvkStatus": "Conversion status per KvK",
	"auction.coin.converted": "Coins finalized",
	"auction.coin.notConverted": "Not closed",
	"auction.coin.keepInfo": "Keep % of old balance: {keep}% (set in Kingdom config).",
	"kd2.coinKeepPct": "Coin keep %",
	"kd2.coinKeepHint": "When a KvK closes, coins are finalized: new balance = new points + (old balance × keep %). Default 100% (keep all).",
	"kdcfg.tab": "Kingdom",
	"kdcfg.title": "Kingdom config",
	"kdcfg.kingdomLabel": "Kingdom",
	"kdcfg.adminNote": "You are a system admin — manage each kingdom under Kingdoms.",
	"kvko.closeTitle": "Close KvK",
	"kvko.closeDesc": "Closing the KvK auto-finalizes DKP → coins (keeping {keep}% of old balance) and CANNOT be undone.",
	"kvko.closeBtn": "Close KvK",
	"kvko.closeWarn": "This cannot be undone. The KvK will be closed permanently and coins finalized immediately.",
	"kvko.closeConfirm": "Confirm close KvK",
	"kvko.closedTitle": "KvK closed",
	"kvko.closedDesc": "This KvK has been closed. It cannot be reopened.",
	"kvko.convertedInfo": "Coins finalized at {date} (kept {keep}%).",
	"kvko.closedMsg": "KvK closed. Finalized {granted} coins for {members} members (kept {keep}%).",
	"kvko.err.alreadyClosed": "This KvK is already closed",

	"auction.create.title": "Create auction",
	"auction.create.name": "Auction name",
	"auction.create.opensAt": "Opens (UTC)",
	"auction.create.closesAt": "Closes (UTC)",
	"auction.create.increment": "Bid increment",
	"auction.create.reserve": "Reserve price",
	"auction.create.softClose": "Soft-close extend (minutes)",
	"auction.create.utcNote": "All times are UTC. Ranks 1–15 are auctioned. Only one auction may exist at a time.",
	"auction.create.submit": "Create auction",

	"auction.results.title": "Settled results",
	"auction.wallets.title": "Member coin balances",
	"auction.audit.title": "Action log",
	"auction.action.convert": "Convert DKP",
	"auction.action.create": "Create auction",
	"auction.action.open": "Open auction",
	"auction.action.close": "Close auction",
	"auction.action.settle": "Settle",
	"auction.action.cancel_result": "Cancel & refund",
	"auction.action.adjust_result": "Adjust position",

	"auction.bid.title": "Place a bid",
	"auction.bid.hint": "Minimum unit price: {min}. Total cost = unit price × the rank's sculptures.",
	"auction.bid.unitPrice": "Unit price (coins/sculpture)",
	"auction.bid.submit": "Place bid",
	"auction.bid.raiseOnly": "Once you bid you may only raise it, never lower.",

	"auction.ladder.title": "Rank ladder (anonymous)",
	"auction.reveal.title": "Public results",
	"auction.rules.title": "Auction rules",
	"auction.rules.body":
		"In short: You spend COINS (converted from DKP) to win one MGE rank (1–15). The higher you bid, the better the rank and the more sculptures. Two guarantees: you only lose coins IF YOU WIN, and you never pay more than the price you typed.\n" +
		"\n" +
		"— YOUR COINS —\n" +
		"1. You accrue DKP each KvK. King/R4 converts DKP → coins once per KvK (1:1 by default).\n" +
		"2. Unused coins carry over to the next period.\n" +
		"\n" +
		"— HOW TO BID —\n" +
		"3. You type a UNIT PRICE = coins per sculpture. You do NOT pick a rank directly — the system ranks you by unit price: bid higher, get a better rank.\n" +
		"4. Each player holds one slot only. Once you bid you may ONLY RAISE, never lower, and never exceed your balance.\n" +
		"   (Why raise-only: a higher rank costs more coins, so the system checks you can afford it the moment you raise. Being pushed down always gets cheaper — you can never get stuck unable to pay.)\n" +
		"\n" +
		"— WHAT YOU PAY —\n" +
		"5. Ranking: higher unit price ranks higher. Ties: higher DKP first, then whoever bid earlier.\n" +
		"6. You pay the price of the PERSON JUST BELOW you (+1 increment), NOT the price you typed. The last person, with no one below, pays the reserve price.\n" +
		"   Example: you type 10, the person below you typed 7 → you only pay a unit price of 8. Bid your true maximum without fear of overpaying.\n" +
		"7. Total coins due = actual unit price × the rank's sculptures. Higher ranks have more sculptures, so they cost more.\n" +
		"8. Ranked 16th or lower: no slot, no coins lost.\n" +
		"\n" +
		"— FAIRNESS & TRANSPARENCY —\n" +
		"9. The auction is ANONYMOUS while live: you only see the price at each rank, never who anyone is or how many coins they hold. After close, identities and all bids are made public so anyone can verify.\n" +
		"10. Anti-snipe: if someone overtakes in the final minutes, the close time extends automatically — you always get a chance to respond, no last-second sniping.\n" +
		"\n" +
		"— AFTER CLOSE (done by King/R4) —\n" +
		"11. Settle: winners' coins are deducted and positions recorded. Non-winners get all their held coins released.\n" +
		"12. Cancel & refund: if the kingdom cannot secure a slot, ALL coins are refunded with a public reason.\n" +
		"13. Adjustment: moving up deducts extra coins, moving down refunds the difference.\n" +
		"\n" +
		"All times are in UTC.",

	"auction.liveUpdated": "Updated at {time}",
	"auction.refresh": "Refresh",

	"auction.msg.converted": "Converted: granted {granted} coins to {members} members.",
	"auction.msg.saved": "Saved.",
	"auction.msg.bidRank": "Bid placed — provisional rank {rank}, projected cost {cost} coins.",
	"auction.msg.bidNoSlot": "Bid placed, but you are not in the winning set (ranks 1–15) yet.",
	"auction.msg.extended": "Close time was extended (anti-snipe).",

	"auction.err.keepPct": "Keep % must be between 0 and 100",
	"auction.err.pickKvk": "Please pick a KvK to convert",
	"auction.err.alreadyConverted": "This KvK's DKP has already been converted",
	"auction.err.title": "Please enter an auction name",
	"auction.err.times": "Invalid open/close times",
	"auction.err.notFound": "Auction/result not found",
	"auction.err.reason": "Please enter a reason",
	"auction.err.noKingdom": "You are not in a kingdom",
	"auction.err.notOpen": "The auction is not open",
	"auction.err.invalidBid": "Invalid bid amount",
	"auction.err.closed": "The auction has closed",
	"auction.err.tooLow": "Bid too low — minimum {min}",
	"auction.err.insufficient": "Not enough coins — need {needed}, you have {balance}",

	"auction.export": "Export CSV",
};
