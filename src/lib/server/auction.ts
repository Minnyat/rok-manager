/**
 * MGE auction engine — Generalized Second-Price (GSP) over rank slots 1..15.
 *
 * Model (see docs/dkp-auction-process.md):
 *  - Each member submits ONE unit price (coins per sculpture); they may only
 *    raise it. Rank is derived by sorting unit prices descending.
 *  - Rank i pays (unit price of rank i+1) + 1 increment, capped at their own
 *    bid; the lowest filled slot with no one below pays the reserve.
 *  - Total cost = unit_paid × sculptures(rank).
 *
 * Money safety without locking: because bids only ever increase, a member can
 * only be pushed to a WORSE (cheaper) rank by others. The only person whose
 * cost can rise is the one actively raising — checked at that moment against
 * their full balance. So a final settlement charge is always ≤ what was checked.
 */

import { getActiveVersionForKvk } from "./kvk";
import {
	getBalance,
	ledgerStmt,
	auditStmt,
	runBatched,
	logAudit,
} from "./dkp";

export interface Auction {
	id: number;
	kingdom_id: number;
	kvk_id: number | null;
	title: string;
	status: "draft" | "open" | "closed" | "settled" | "cancelled";
	increment: number;
	reserve: number;
	max_rank: number;
	opens_at: number;
	closes_at: number;
	original_closes_at: number;
	soft_close_minutes: number;
	created_by: number | null;
	settled_by: number | null;
	settled_at: number | null;
	created_at: number;
	updated_at: number;
}

export interface CurrentBid {
	user_id: number;
	governor_id: number | null;
	unit_price: number;
	created_at: number;
}

export interface RankedBid extends CurrentBid {
	dkp: number;
}

export interface LadderRow {
	rank: number;
	sculptures: number;
	currentPrice: number | null;
	minToClaim: number;
}

export interface ResultRow {
	user_id: number;
	governor_id: number | null;
	rank: number;
	sculptures: number;
	unit_paid: number;
	total_cost: number;
}

export function nowSec(): number {
	return Math.floor(Date.now() / 1000);
}

// ---------------------------------------------------------------------------
// Rank reward table (system-wide)
// ---------------------------------------------------------------------------

export async function getRankRewards(db: D1Database): Promise<Map<number, number>> {
	const rows = await db
		.prepare("SELECT rank, sculptures FROM mge_rank_rewards ORDER BY rank ASC")
		.all<{ rank: number; sculptures: number }>();
	const map = new Map<number, number>();
	for (const r of rows.results) map.set(r.rank, r.sculptures);
	return map;
}

function sculpturesOf(
	rewards: Map<number, number>,
	rank: number,
	maxRank: number,
): number {
	if (rank < 1 || rank > maxRank) return 0;
	return rewards.get(rank) ?? 0;
}

// ---------------------------------------------------------------------------
// Auction fetch + status transitions
// ---------------------------------------------------------------------------

export async function getAuctionById(
	db: D1Database,
	id: number,
): Promise<Auction | null> {
	return db.prepare("SELECT * FROM auctions WHERE id = ?").bind(id).first<Auction>();
}

/** The single non-terminal auction for a kingdom (draft|open|closed), refreshed. */
export async function getLiveAuction(
	db: D1Database,
	kingdomId: number,
): Promise<Auction | null> {
	const a = await db
		.prepare(
			"SELECT * FROM auctions WHERE kingdom_id = ? AND status IN ('draft','open','closed') ORDER BY id DESC LIMIT 1",
		)
		.bind(kingdomId)
		.first<Auction>();
	if (!a) return null;
	return refreshAuctionStatus(db, a);
}

/** Open a scheduled auction / close an expired one based on the clock (UTC). */
export async function refreshAuctionStatus(
	db: D1Database,
	a: Auction,
): Promise<Auction> {
	const now = nowSec();
	let status = a.status;
	if (status === "draft" && now >= a.opens_at) status = "open";
	if (status === "open" && now >= a.closes_at) status = "closed";
	if (status !== a.status) {
		await db
			.prepare("UPDATE auctions SET status = ?, updated_at = unixepoch() WHERE id = ?")
			.bind(status, a.id)
			.run();
		return { ...a, status };
	}
	return a;
}

// ---------------------------------------------------------------------------
// Bids + ranking
// ---------------------------------------------------------------------------

/** Current (highest) bid per user. Raise-only ⇒ highest is also latest. */
export async function getCurrentBids(
	db: D1Database,
	auctionId: number,
): Promise<CurrentBid[]> {
	const rows = await db
		.prepare(
			"SELECT user_id, governor_id, unit_price, created_at FROM auction_bids WHERE auction_id = ? ORDER BY id ASC",
		)
		.bind(auctionId)
		.all<CurrentBid>();
	const byUser = new Map<number, CurrentBid>();
	for (const r of rows.results) {
		const cur = byUser.get(r.user_id);
		if (!cur || r.unit_price > cur.unit_price) byUser.set(r.user_id, r);
	}
	return [...byUser.values()];
}

/** DKP (dkp_combined) per governor for the auction's KvK active version. */
export async function getDkpByGovernor(
	db: D1Database,
	auction: Auction,
): Promise<Map<number, number>> {
	const map = new Map<number, number>();
	if (auction.kvk_id == null) return map;
	const version = await getActiveVersionForKvk(db, auction.kvk_id);
	if (!version) return map;
	const rows = await db
		.prepare("SELECT governor_id, dkp_combined FROM player_scores WHERE version_id = ?")
		.bind(version.id)
		.all<{ governor_id: number; dkp_combined: number }>();
	for (const r of rows.results) map.set(r.governor_id, r.dkp_combined);
	return map;
}

/**
 * Sort bids into a ranking: unit price desc, then DKP desc (tiebreak), then
 * earliest to reach that price, then user_id for full determinism.
 */
export function rankBids(
	bids: CurrentBid[],
	dkpByGov: Map<number, number>,
): RankedBid[] {
	return bids
		.map((b) => ({ ...b, dkp: dkpByGov.get(b.governor_id ?? -1) ?? 0 }))
		.sort(
			(a, b) =>
				b.unit_price - a.unit_price ||
				b.dkp - a.dkp ||
				a.created_at - b.created_at ||
				a.user_id - b.user_id,
		);
}

// ---------------------------------------------------------------------------
// Place a bid
// ---------------------------------------------------------------------------

export type PlaceBidResult =
	| {
			ok: true;
			newRank: number | null;
			cost: number;
			extendedTo: number | null;
	  }
	| { ok: false; error: string; min?: number; needed?: number; balance?: number };

/**
 * Place / raise a bid. Validates raise-only + affordability, appends the bid,
 * and applies soft-close (anti-snipe) if a standings change lands near the end.
 */
export async function placeBid(
	db: D1Database,
	auction: Auction,
	userId: number,
	governorId: number | null,
	unitPrice: number,
): Promise<PlaceBidResult> {
	const now = nowSec();
	if (auction.status !== "open") return { ok: false, error: "notOpen" };
	if (now >= auction.closes_at) return { ok: false, error: "closed" };
	if (!Number.isInteger(unitPrice) || unitPrice <= 0)
		return { ok: false, error: "invalid" };

	const bids = await getCurrentBids(db, auction.id);
	const mine = bids.find((b) => b.user_id === userId);
	const minAllowed = mine ? mine.unit_price + auction.increment : auction.reserve;
	if (unitPrice < minAllowed || (mine && unitPrice <= mine.unit_price))
		return { ok: false, error: "tooLow", min: minAllowed };

	// Provisional ranking with this bid applied.
	const dkpByGov = await getDkpByGovernor(db, auction);
	const projected: CurrentBid[] = bids.filter((b) => b.user_id !== userId);
	projected.push({ user_id: userId, governor_id: governorId, unit_price: unitPrice, created_at: now });
	const ranked = rankBids(projected, dkpByGov);
	const idx = ranked.findIndex((b) => b.user_id === userId);
	const newRank = idx + 1;

	const rewards = await getRankRewards(db);
	const sculptures = sculpturesOf(rewards, newRank, auction.max_rank);
	const cost = unitPrice * sculptures;

	const balance = await getBalance(db, auction.kingdom_id, userId);
	if (cost > balance)
		return { ok: false, error: "insufficient", needed: cost, balance };

	await db
		.prepare(
			"INSERT INTO auction_bids (auction_id, user_id, governor_id, unit_price) VALUES (?, ?, ?, ?)",
		)
		.bind(auction.id, userId, governorId, unitPrice)
		.run();

	// Soft-close: a standings-relevant bid (lands in a winning slot) in the final
	// window pushes the close out, repeatedly.
	let extendedTo: number | null = null;
	const windowSec = auction.soft_close_minutes * 60;
	if (
		windowSec > 0 &&
		newRank <= auction.max_rank &&
		auction.closes_at - now <= windowSec
	) {
		extendedTo = now + windowSec;
		await db
			.prepare("UPDATE auctions SET closes_at = ?, updated_at = unixepoch() WHERE id = ?")
			.bind(extendedTo, auction.id)
			.run();
	}

	return {
		ok: true,
		newRank: newRank <= auction.max_rank ? newRank : null,
		cost,
		extendedTo,
	};
}

// ---------------------------------------------------------------------------
// Settlement (GSP) — compute is pure; confirm moves money
// ---------------------------------------------------------------------------

export async function computeResults(
	db: D1Database,
	auction: Auction,
): Promise<ResultRow[]> {
	const bids = await getCurrentBids(db, auction.id);
	const dkpByGov = await getDkpByGovernor(db, auction);
	const ranked = rankBids(bids, dkpByGov);
	const rewards = await getRankRewards(db);

	const n = Math.min(ranked.length, auction.max_rank);
	const results: ResultRow[] = [];
	for (let i = 0; i < n; i++) {
		const rank = i + 1;
		const sculptures = sculpturesOf(rewards, rank, auction.max_rank);
		// GSP: pay (next-lower bid) + increment; if nobody is below, pay the
		// reserve exactly. Never more than your own bid.
		const hasBelow = i + 1 < ranked.length;
		const rawPrice = hasBelow
			? ranked[i + 1].unit_price + auction.increment
			: auction.reserve;
		const unitPaid = Math.min(
			ranked[i].unit_price,
			Math.max(auction.reserve, rawPrice),
		);
		results.push({
			user_id: ranked[i].user_id,
			governor_id: ranked[i].governor_id,
			rank,
			sculptures,
			unit_paid: unitPaid,
			total_cost: unitPaid * sculptures,
		});
	}
	return results;
}

/**
 * Finalize: write results, charge each winner via the ledger, mark settled.
 * Requires the auction to be 'closed'. Idempotent guard via status.
 */
export async function confirmSettlement(
	db: D1Database,
	auction: Auction,
	actorUserId: number,
): Promise<{ winners: number; charged: number }> {
	if (auction.status !== "closed") {
		throw new Error("Auction must be closed before settlement");
	}
	const results = await computeResults(db, auction);

	const ledgerStmts: D1PreparedStatement[] = [];
	let charged = 0;
	for (const r of results) {
		const res = await db
			.prepare(
				`INSERT INTO auction_results
				 (auction_id, user_id, governor_id, rank, sculptures, unit_paid, total_cost)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				auction.id,
				r.user_id,
				r.governor_id,
				r.rank,
				r.sculptures,
				r.unit_paid,
				r.total_cost,
			)
			.run();
		const resultId = res.meta.last_row_id as number;
		if (r.total_cost > 0) {
			ledgerStmts.push(
				ledgerStmt(db, {
					kingdomId: auction.kingdom_id,
					userId: r.user_id,
					governorId: r.governor_id,
					kvkId: auction.kvk_id,
					type: "charge",
					amount: -r.total_cost,
					auctionId: auction.id,
					resultId,
					createdBy: actorUserId,
				}),
			);
			charged += r.total_cost;
		}
	}

	ledgerStmts.push(
		auditStmt(db, {
			kingdomId: auction.kingdom_id,
			auctionId: auction.id,
			actorUserId,
			action: "settle",
			detail: { winners: results.length, charged },
		}),
	);
	ledgerStmts.push(
		db
			.prepare(
				"UPDATE auctions SET status = 'settled', settled_by = ?, settled_at = unixepoch(), updated_at = unixepoch() WHERE id = ?",
			)
			.bind(actorUserId, auction.id),
	);

	await runBatched(db, ledgerStmts);
	return { winners: results.length, charged };
}

// ---------------------------------------------------------------------------
// Post-settlement King/R4 corrections
// ---------------------------------------------------------------------------

interface ResultFull extends ResultRow {
	id: number;
	auction_id: number;
	status: "active" | "cancelled";
}

async function getResultById(
	db: D1Database,
	resultId: number,
): Promise<ResultFull | null> {
	return db
		.prepare("SELECT * FROM auction_results WHERE id = ?")
		.bind(resultId)
		.first<ResultFull>();
}

/** Cancel a settled result and fully refund. Reason required (public). */
export async function cancelResult(
	db: D1Database,
	resultId: number,
	reason: string,
	actorUserId: number,
): Promise<void> {
	if (!reason?.trim()) throw new Error("A reason is required to cancel");
	const r = await getResultById(db, resultId);
	if (!r) throw new Error("Result not found");
	if (r.status !== "active") return; // already cancelled — idempotent
	const auction = await getAuctionById(db, r.auction_id);
	if (!auction) throw new Error("Auction not found");

	await db
		.prepare("UPDATE auction_results SET status = 'cancelled', updated_at = unixepoch() WHERE id = ?")
		.bind(resultId)
		.run();

	await runBatched(db, [
		ledgerStmt(db, {
			kingdomId: auction.kingdom_id,
			userId: r.user_id,
			governorId: r.governor_id,
			kvkId: auction.kvk_id,
			type: "refund",
			amount: r.total_cost,
			auctionId: auction.id,
			resultId,
			reason: reason.trim(),
			createdBy: actorUserId,
		}),
		auditStmt(db, {
			kingdomId: auction.kingdom_id,
			auctionId: auction.id,
			actorUserId,
			action: "cancel_result",
			targetUserId: r.user_id,
			reason: reason.trim(),
			detail: { rank: r.rank, refunded: r.total_cost },
		}),
	]);
}

/**
 * Move a settled result to a new rank. Keeps the same unit_paid, recomputes the
 * total from the new rank's sculptures, and posts the signed difference. Reason
 * required (public). Raising rank costs more; lowering refunds the difference.
 */
export async function adjustResult(
	db: D1Database,
	resultId: number,
	newRank: number,
	reason: string,
	actorUserId: number,
): Promise<void> {
	if (!reason?.trim()) throw new Error("A reason is required to adjust");
	const r = await getResultById(db, resultId);
	if (!r) throw new Error("Result not found");
	if (r.status !== "active") throw new Error("Result is cancelled");
	const auction = await getAuctionById(db, r.auction_id);
	if (!auction) throw new Error("Auction not found");
	if (!Number.isInteger(newRank) || newRank < 1 || newRank > auction.max_rank)
		throw new Error("Invalid rank");

	const rewards = await getRankRewards(db);
	const newSculptures = sculpturesOf(rewards, newRank, auction.max_rank);
	const newTotal = r.unit_paid * newSculptures;
	const delta = newTotal - r.total_cost; // >0 costs more, <0 refunds
	if (delta === 0 && newRank === r.rank) return;

	await db
		.prepare(
			"UPDATE auction_results SET rank = ?, sculptures = ?, total_cost = ?, updated_at = unixepoch() WHERE id = ?",
		)
		.bind(newRank, newSculptures, newTotal, resultId)
		.run();

	await runBatched(db, [
		ledgerStmt(db, {
			kingdomId: auction.kingdom_id,
			userId: r.user_id,
			governorId: r.governor_id,
			kvkId: auction.kvk_id,
			type: "adjust",
			amount: -delta, // delta>0 → deduct; delta<0 → refund
			auctionId: auction.id,
			resultId,
			reason: reason.trim(),
			createdBy: actorUserId,
		}),
		auditStmt(db, {
			kingdomId: auction.kingdom_id,
			auctionId: auction.id,
			actorUserId,
			action: "adjust_result",
			targetUserId: r.user_id,
			reason: reason.trim(),
			detail: { fromRank: r.rank, toRank: newRank, delta },
		}),
	]);
}

// ---------------------------------------------------------------------------
// Create / open / close
// ---------------------------------------------------------------------------

export interface CreateAuctionInput {
	title: string;
	increment: number;
	reserve: number;
	opensAt: number; // UTC epoch seconds
	closesAt: number; // UTC epoch seconds
	softCloseMinutes: number;
	maxRank?: number;
}

export async function createAuction(
	db: D1Database,
	kingdomId: number,
	kvkId: number | null,
	input: CreateAuctionInput,
	actorUserId: number,
): Promise<number> {
	const existing = await getLiveAuction(db, kingdomId);
	if (existing) throw new Error("A live auction already exists for this kingdom");
	if (!input.title?.trim()) throw new Error("Title is required");
	if (!Number.isInteger(input.increment) || input.increment < 1)
		throw new Error("Increment must be a positive integer");
	if (!Number.isInteger(input.reserve) || input.reserve < 0)
		throw new Error("Reserve must be a non-negative integer");
	if (input.closesAt <= input.opensAt)
		throw new Error("Close time must be after open time");

	const maxRank = input.maxRank ?? 15;
	const now = nowSec();
	const status = now >= input.opensAt ? "open" : "draft";

	const res = await db
		.prepare(
			`INSERT INTO auctions
			 (kingdom_id, kvk_id, title, status, increment, reserve, max_rank,
			  opens_at, closes_at, original_closes_at, soft_close_minutes, created_by)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			kingdomId,
			kvkId,
			input.title.trim(),
			status,
			input.increment,
			input.reserve,
			maxRank,
			input.opensAt,
			input.closesAt,
			input.closesAt,
			input.softCloseMinutes,
			actorUserId,
		)
		.run();
	const id = res.meta.last_row_id as number;

	await logAudit(db, {
		kingdomId,
		auctionId: id,
		actorUserId,
		action: "create",
		detail: { title: input.title.trim(), opensAt: input.opensAt, closesAt: input.closesAt },
	});
	return id;
}

/** Manually close an open auction now (King/R4). */
export async function closeAuctionNow(
	db: D1Database,
	auction: Auction,
	actorUserId: number,
): Promise<void> {
	if (auction.status !== "open" && auction.status !== "draft") return;
	await db
		.prepare(
			"UPDATE auctions SET status = 'closed', closes_at = MIN(closes_at, unixepoch()), updated_at = unixepoch() WHERE id = ?",
		)
		.bind(auction.id)
		.run();
	await logAudit(db, {
		kingdomId: auction.kingdom_id,
		auctionId: auction.id,
		actorUserId,
		action: "close",
	});
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

export interface AuctionView {
	auction: Auction;
	ladder: LadderRow[];
	viewer: {
		balance: number;
		available: number;
		currentBid: number | null;
		provRank: number | null;
		hold: number;
		isWinning: boolean;
	} | null;
}

/** Anonymized live state for a player: the rank ladder + the viewer's own slot. */
export async function getAuctionView(
	db: D1Database,
	auction: Auction,
	viewerUserId?: number,
): Promise<AuctionView> {
	const bids = await getCurrentBids(db, auction.id);
	const dkpByGov = await getDkpByGovernor(db, auction);
	const ranked = rankBids(bids, dkpByGov);
	const rewards = await getRankRewards(db);

	const ladder: LadderRow[] = [];
	for (let rank = 1; rank <= auction.max_rank; rank++) {
		const occ = ranked[rank - 1];
		ladder.push({
			rank,
			sculptures: sculpturesOf(rewards, rank, auction.max_rank),
			currentPrice: occ ? occ.unit_price : null,
			minToClaim: occ ? occ.unit_price + auction.increment : auction.reserve,
		});
	}

	let viewer: AuctionView["viewer"] = null;
	if (viewerUserId != null) {
		const idx = ranked.findIndex((b) => b.user_id === viewerUserId);
		const provRank = idx >= 0 ? idx + 1 : null;
		const mine = bids.find((b) => b.user_id === viewerUserId) ?? null;
		const isWinning = provRank != null && provRank <= auction.max_rank;
		const sculptures = isWinning
			? sculpturesOf(rewards, provRank!, auction.max_rank)
			: 0;
		const hold = mine ? mine.unit_price * sculptures : 0;
		const balance = await getBalance(db, auction.kingdom_id, viewerUserId);
		viewer = {
			balance,
			available: balance - hold,
			currentBid: mine ? mine.unit_price : null,
			provRank,
			hold,
			isWinning,
		};
	}

	return { auction, ladder, viewer };
}

export interface RevealRow extends RankedBid {
	display_name: string;
}

/** Full identities + bids, only meaningful after the auction has closed. */
export async function getPublicReveal(
	db: D1Database,
	auction: Auction,
): Promise<{ ranked: RevealRow[]; results: ResultRow[] }> {
	const bids = await getCurrentBids(db, auction.id);
	const dkpByGov = await getDkpByGovernor(db, auction);
	const ranked = rankBids(bids, dkpByGov);

	// Look up governor names from the latest KvK for this kingdom
	const govIds = ranked
		.map((r) => r.governor_id)
		.filter((id): id is number => id != null);
	const nameByGovId = new Map<number, string>();
	if (govIds.length) {
		const rows = await db
			.prepare(
				`SELECT pd.governor_id, pd.governor_name
				 FROM player_data pd
				 JOIN kvks k ON k.active_version_id = pd.version_id
				 WHERE k.kingdom_id = ?
				   AND pd.governor_id IN (${govIds.map(() => "?").join(",")})
				   AND k.id = (SELECT MAX(id) FROM kvks WHERE kingdom_id = ? AND active_version_id IS NOT NULL)`,
			)
			.bind(auction.kingdom_id, ...govIds, auction.kingdom_id)
			.all<{ governor_id: number; governor_name: string }>();
		for (const u of rows.results) nameByGovId.set(u.governor_id, u.governor_name);
	}

	// Fallback to username for anyone not found in KvK player data
	const fallbackUserIds = ranked
		.filter((r) => r.governor_id == null || !nameByGovId.has(r.governor_id))
		.map((r) => r.user_id);
	const usernameById = new Map<number, string>();
	if (fallbackUserIds.length) {
		const rows = await db
			.prepare(
				`SELECT id, username FROM users WHERE id IN (${fallbackUserIds.map(() => "?").join(",")})`,
			)
			.bind(...fallbackUserIds)
			.all<{ id: number; username: string }>();
		for (const u of rows.results) usernameById.set(u.id, u.username);
	}

	const revealed: RevealRow[] = ranked.map((r) => ({
		...r,
		display_name:
			(r.governor_id != null ? nameByGovId.get(r.governor_id) : undefined) ??
			usernameById.get(r.user_id) ??
			`#${r.user_id}`,
	}));

	// Stored results if settled, else freshly computed preview.
	let results: ResultRow[];
	if (auction.status === "settled" || auction.status === "cancelled") {
		const rows = await db
			.prepare(
				"SELECT user_id, governor_id, rank, sculptures, unit_paid, total_cost FROM auction_results WHERE auction_id = ? ORDER BY rank ASC",
			)
			.bind(auction.id)
			.all<ResultRow>();
		results = rows.results;
	} else {
		results = await computeResults(db, auction);
	}

	return { ranked: revealed, results };
}
