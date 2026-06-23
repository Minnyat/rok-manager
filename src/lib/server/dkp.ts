/**
 * DKP coin wallet — immutable ledger + DKP→coin conversion.
 *
 * A wallet balance is NEVER a stored counter. It is always
 *   balance(kingdom, user) = SUM(dkp_ledger.amount).
 * Every grant / decay / charge / refund / adjust is one immutable ledger row.
 *
 * "Available to bid" (balance minus live escrow held by open bids) lives in
 * auction.ts, which has the bid/ranking context. This module stays ledger-only
 * so it has no dependency on the auction engine.
 */

import { getActiveVersionForKvk } from "./kvk";

export type LedgerEntryType =
	| "grant"
	| "decay"
	| "charge"
	| "refund"
	| "adjust";

const BATCH_SIZE = 40;

export interface LedgerInput {
	kingdomId: number;
	userId: number;
	governorId?: number | null;
	kvkId?: number | null;
	type: LedgerEntryType;
	amount: number; // signed integer
	auctionId?: number | null;
	resultId?: number | null;
	reason?: string | null;
	createdBy?: number | null;
}

/** Build (but do not run) a ledger INSERT statement, for batching. */
export function ledgerStmt(db: D1Database, e: LedgerInput): D1PreparedStatement {
	if (!Number.isInteger(e.amount)) {
		throw new Error("Ledger amount must be an integer");
	}
	if ((e.type === "refund" || e.type === "adjust") && !e.reason) {
		throw new Error(`Ledger '${e.type}' requires a reason`);
	}
	return db
		.prepare(
			`INSERT INTO dkp_ledger
			 (kingdom_id, user_id, governor_id, kvk_id, entry_type, amount, auction_id, result_id, reason, created_by)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			e.kingdomId,
			e.userId,
			e.governorId ?? null,
			e.kvkId ?? null,
			e.type,
			e.amount,
			e.auctionId ?? null,
			e.resultId ?? null,
			e.reason ?? null,
			e.createdBy ?? null,
		);
}

/** Run a batch of statements in chunks (D1 caps batch size). */
export async function runBatched(
	db: D1Database,
	stmts: D1PreparedStatement[],
): Promise<void> {
	for (let i = 0; i < stmts.length; i += BATCH_SIZE) {
		await db.batch(stmts.slice(i, i + BATCH_SIZE));
	}
}

export interface AuditInput {
	kingdomId: number;
	auctionId?: number | null;
	actorUserId?: number | null;
	action: string;
	targetUserId?: number | null;
	detail?: unknown;
	reason?: string | null;
}

/** Build (but do not run) an audit-log INSERT statement, for batching. */
export function auditStmt(db: D1Database, a: AuditInput): D1PreparedStatement {
	return db
		.prepare(
			`INSERT INTO auction_audit_log
			 (auction_id, kingdom_id, actor_user_id, action, target_user_id, detail_json, reason)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			a.auctionId ?? null,
			a.kingdomId,
			a.actorUserId ?? null,
			a.action,
			a.targetUserId ?? null,
			a.detail === undefined ? null : JSON.stringify(a.detail),
			a.reason ?? null,
		);
}

export async function logAudit(db: D1Database, a: AuditInput): Promise<void> {
	await auditStmt(db, a).run();
}

/** Current coin balance for one wallet. */
export async function getBalance(
	db: D1Database,
	kingdomId: number,
	userId: number,
): Promise<number> {
	const row = await db
		.prepare(
			"SELECT COALESCE(SUM(amount), 0) AS balance FROM dkp_ledger WHERE kingdom_id = ? AND user_id = ?",
		)
		.bind(kingdomId, userId)
		.first<{ balance: number }>();
	return row?.balance ?? 0;
}

/** Balances for every wallet in a kingdom, keyed by user_id. */
export async function getBalanceMap(
	db: D1Database,
	kingdomId: number,
): Promise<Map<number, number>> {
	const rows = await db
		.prepare(
			"SELECT user_id, COALESCE(SUM(amount), 0) AS balance FROM dkp_ledger WHERE kingdom_id = ? GROUP BY user_id",
		)
		.bind(kingdomId)
		.all<{ user_id: number; balance: number }>();
	const map = new Map<number, number>();
	for (const r of rows.results) map.set(r.user_id, r.balance);
	return map;
}

export interface Wallet {
	user_id: number;
	username: string;
	governor_id: number;
	balance: number;
}

/** Wallet list for the whole kingdom (members joined with their balance). */
export async function getWalletsForKingdom(
	db: D1Database,
	kingdomId: number,
): Promise<Wallet[]> {
	const rows = await db
		.prepare(
			`SELECT km.user_id, u.username, km.governor_id,
			        COALESCE((SELECT SUM(amount) FROM dkp_ledger l
			                  WHERE l.kingdom_id = km.kingdom_id AND l.user_id = km.user_id), 0) AS balance
			 FROM kingdom_members km
			 JOIN users u ON u.id = km.user_id
			 WHERE km.kingdom_id = ? AND km.status = 'active'
			 ORDER BY balance DESC, u.username ASC`,
		)
		.bind(kingdomId)
		.all<Wallet>();
	return rows.results;
}

export interface ConversionRecord {
	id: number;
	rate: number;
	keep_pct: number;
	converted_by: number | null;
	converted_at: number;
}

/** The conversion record for a (kingdom, KvK), or null if not yet converted. */
export async function getConversion(
	db: D1Database,
	kingdomId: number,
	kvkId: number,
): Promise<ConversionRecord | null> {
	return db
		.prepare(
			"SELECT id, rate, keep_pct, converted_by, converted_at FROM dkp_conversions WHERE kingdom_id = ? AND kvk_id = ?",
		)
		.bind(kingdomId, kvkId)
		.first<ConversionRecord>();
}

export interface ConvertResult {
	alreadyDone: boolean;
	granted: number; // total coins granted
	members: number; // members processed
}

/**
 * Finalize DKP → coins for a (kingdom, KvK). Idempotent: refuses to run twice.
 *
 *   new_balance = floor(old_balance * keepPct/100) + floor(dkp * rate)
 *
 * The cut part (when keepPct < 100) is recorded as a `decay` ledger row so the
 * balance change is always reconstructable. DKP source = dkp_combined of the
 * KvK's active version (0 when a member has no score).
 */
export async function convertDkpToCoins(
	db: D1Database,
	kingdomId: number,
	kvkId: number,
	opts: { keepPct: number; rate?: number },
	actorUserId: number,
): Promise<ConvertResult> {
	const rate = opts.rate ?? 1;
	const keepPct = Math.max(0, Math.min(100, Math.floor(opts.keepPct)));

	// Idempotency guard (also backed by UNIQUE(kingdom_id, kvk_id)).
	if (await getConversion(db, kingdomId, kvkId)) {
		return { alreadyDone: true, granted: 0, members: 0 };
	}

	const version = await getActiveVersionForKvk(db, kvkId);
	const scoreByGov = new Map<number, number>();
	if (version) {
		const scores = await db
			.prepare(
				"SELECT governor_id, dkp_combined FROM player_scores WHERE version_id = ?",
			)
			.bind(version.id)
			.all<{ governor_id: number; dkp_combined: number }>();
		for (const s of scores.results) {
			scoreByGov.set(s.governor_id, s.dkp_combined);
		}
	}

	const members = await db
		.prepare(
			"SELECT user_id, governor_id FROM kingdom_members WHERE kingdom_id = ? AND status = 'active'",
		)
		.bind(kingdomId)
		.all<{ user_id: number; governor_id: number }>();

	const balances = await getBalanceMap(db, kingdomId);

	const stmts: D1PreparedStatement[] = [];
	let granted = 0;

	for (const m of members.results) {
		const old = balances.get(m.user_id) ?? 0;
		const kept = Math.floor((old * keepPct) / 100);
		const decay = old - kept;
		const dkp = Math.floor(scoreByGov.get(m.governor_id) ?? 0);
		const grant = Math.max(0, Math.floor(dkp * rate));

		if (decay > 0) {
			stmts.push(
				ledgerStmt(db, {
					kingdomId,
					userId: m.user_id,
					governorId: m.governor_id,
					kvkId,
					type: "decay",
					amount: -decay,
					reason: `carryover ${keepPct}%`,
					createdBy: actorUserId,
				}),
			);
		}
		// Always record a grant row (even 0) — one per member per KvK.
		stmts.push(
			ledgerStmt(db, {
				kingdomId,
				userId: m.user_id,
				governorId: m.governor_id,
				kvkId,
				type: "grant",
				amount: grant,
				createdBy: actorUserId,
			}),
		);
		granted += grant;
	}

	stmts.push(
		db
			.prepare(
				"INSERT INTO dkp_conversions (kingdom_id, kvk_id, rate, keep_pct, converted_by) VALUES (?, ?, ?, ?, ?)",
			)
			.bind(kingdomId, kvkId, rate, keepPct, actorUserId),
	);
	stmts.push(
		auditStmt(db, {
			kingdomId,
			action: "convert",
			actorUserId,
			detail: { kvkId, rate, keepPct, granted, members: members.results.length },
		}),
	);

	await runBatched(db, stmts);

	return { alreadyDone: false, granted, members: members.results.length };
}
