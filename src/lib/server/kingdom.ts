/**
 * Kingdom (tenant) server helpers.
 *
 * A Kingdom is the top tier above KvK. It owns its KvKs (kvks.kingdom_id) and
 * its members (kingdom_members). Kingdom-scoped role + active/frozen state live
 * in kingdom_members — NOT on users. users.role='admin' stays the system flag.
 */

import { calculateScores } from "./scores";

export interface Kingdom {
	id: number;
	number: string;
	display_name: string | null;
	status: "active" | "suspended" | "archived";
	king_user_id: number | null;
	storage_quota_mb: number;
	coin_keep_pct: number;
	created_by: number | null;
	created_at: number;
	updated_at: number;
}

export type KingdomRole = "king" | "r4" | "member";

export interface KingdomMember {
	id: number;
	kingdom_id: number;
	user_id: number;
	governor_id: number;
	role: KingdomRole;
	status: "active" | "frozen";
	joined_at: number;
	frozen_at: number | null;
	username: string | null;
	user_is_active: number;
}

/** List all kingdoms, newest first. Admin-only view. */
export async function getKingdoms(db: D1Database): Promise<Kingdom[]> {
	const rows = await db
		.prepare("SELECT * FROM kingdoms ORDER BY created_at DESC")
		.all<Kingdom>();
	return rows.results;
}

export async function getKingdomById(
	db: D1Database,
	id: number,
): Promise<Kingdom | null> {
	return db.prepare("SELECT * FROM kingdoms WHERE id = ?").bind(id).first<Kingdom>();
}

export async function getKingdomByNumber(
	db: D1Database,
	number: string,
): Promise<Kingdom | null> {
	return db
		.prepare("SELECT * FROM kingdoms WHERE number = ?")
		.bind(number)
		.first<Kingdom>();
}

/** Create a new kingdom. Returns the new id. */
export async function createKingdom(
	db: D1Database,
	number: string,
	displayName: string | null,
	quotaMb: number,
	createdBy: number,
): Promise<number> {
	const result = await db
		.prepare(
			`INSERT INTO kingdoms (number, display_name, status, storage_quota_mb, created_by, created_at, updated_at)
			 VALUES (?, ?, 'active', ?, ?, unixepoch(), unixepoch())`,
		)
		.bind(number, displayName, quotaMb, createdBy)
		.run();
	return result.meta.last_row_id as number;
}

/** Update kingdom fields (number, display_name, status, storage_quota_mb, king_user_id). */
export async function updateKingdom(
	db: D1Database,
	id: number,
	fields: {
		number?: string;
		display_name?: string | null;
		status?: string;
		storage_quota_mb?: number;
		king_user_id?: number;
		coin_keep_pct?: number;
	},
): Promise<void> {
	const sets: string[] = [];
	const values: (string | number | null)[] = [];

	if (fields.number !== undefined) {
		sets.push("number = ?");
		values.push(fields.number);
	}
	if (fields.display_name !== undefined) {
		sets.push("display_name = ?");
		values.push(fields.display_name);
	}
	if (fields.status !== undefined) {
		sets.push("status = ?");
		values.push(fields.status);
	}
	if (fields.storage_quota_mb !== undefined) {
		sets.push("storage_quota_mb = ?");
		values.push(fields.storage_quota_mb);
	}
	if (fields.king_user_id !== undefined) {
		sets.push("king_user_id = ?");
		values.push(fields.king_user_id);
	}
	if (fields.coin_keep_pct !== undefined) {
		sets.push("coin_keep_pct = ?");
		values.push(fields.coin_keep_pct);
	}

	if (sets.length === 0) return;

	sets.push("updated_at = unixepoch()");
	values.push(id);

	await db
		.prepare(`UPDATE kingdoms SET ${sets.join(", ")} WHERE id = ?`)
		.bind(...values)
		.run();
}

export interface KingdomStats {
	memberCount: number;
	frozenCount: number;
	kvkCount: number;
	versionCount: number;
	usedBytes: number;
	quotaBytes: number;
}

/** Aggregate stats for the admin "resource usage" view. */
export async function getKingdomStats(
	db: D1Database,
	id: number,
): Promise<KingdomStats> {
	const members = await db
		.prepare(
			`SELECT
				SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
				SUM(CASE WHEN status = 'frozen' THEN 1 ELSE 0 END) AS frozen
			 FROM kingdom_members WHERE kingdom_id = ?`,
		)
		.bind(id)
		.first<{ active: number | null; frozen: number | null }>();

	const kvkCount = await db
		.prepare("SELECT COUNT(*) AS c FROM kvks WHERE kingdom_id = ?")
		.bind(id)
		.first<{ c: number }>();

	const versions = await db
		.prepare(
			`SELECT COUNT(*) AS c, COALESCE(SUM(dv.size_bytes), 0) AS used
			 FROM data_versions dv JOIN kvks k ON dv.kvk_id = k.id
			 WHERE k.kingdom_id = ?`,
		)
		.bind(id)
		.first<{ c: number; used: number }>();

	const kingdom = await db
		.prepare("SELECT storage_quota_mb FROM kingdoms WHERE id = ?")
		.bind(id)
		.first<{ storage_quota_mb: number }>();

	return {
		memberCount: members?.active ?? 0,
		frozenCount: members?.frozen ?? 0,
		kvkCount: kvkCount?.c ?? 0,
		versionCount: versions?.c ?? 0,
		usedBytes: versions?.used ?? 0,
		quotaBytes: (kingdom?.storage_quota_mb ?? 0) * 1024 * 1024,
	};
}

/** Storage usage for import gating. */
export async function getKingdomStorage(
	db: D1Database,
	id: number,
): Promise<{ usedBytes: number; quotaBytes: number; quotaMb: number }> {
	const used = await db
		.prepare(
			`SELECT COALESCE(SUM(dv.size_bytes), 0) AS used
			 FROM data_versions dv JOIN kvks k ON dv.kvk_id = k.id
			 WHERE k.kingdom_id = ?`,
		)
		.bind(id)
		.first<{ used: number }>();

	const kingdom = await db
		.prepare("SELECT storage_quota_mb FROM kingdoms WHERE id = ?")
		.bind(id)
		.first<{ storage_quota_mb: number }>();

	const quotaMb = kingdom?.storage_quota_mb ?? 0;
	return {
		usedBytes: used?.used ?? 0,
		quotaBytes: quotaMb * 1024 * 1024,
		quotaMb,
	};
}

/** The user's current (active) membership, or null. */
export async function getActiveMembership(
	db: D1Database,
	userId: number,
): Promise<{ kingdom_id: number; role: KingdomRole; governor_id: number } | null> {
	return db
		.prepare(
			`SELECT kingdom_id, role, governor_id FROM kingdom_members
			 WHERE user_id = ? AND status = 'active' LIMIT 1`,
		)
		.bind(userId)
		.first<{ kingdom_id: number; role: KingdomRole; governor_id: number }>();
}

/** List members of a kingdom (Kings first, then R4, then members). */
export async function getMembers(
	db: D1Database,
	kingdomId: number,
): Promise<KingdomMember[]> {
	const rows = await db
		.prepare(
			`SELECT km.id, km.kingdom_id, km.user_id, km.governor_id, km.role, km.status,
			        km.joined_at, km.frozen_at, u.username, u.is_active AS user_is_active
			 FROM kingdom_members km JOIN users u ON u.id = km.user_id
			 WHERE km.kingdom_id = ?
			 ORDER BY CASE km.role WHEN 'king' THEN 0 WHEN 'r4' THEN 1 ELSE 2 END,
			          km.status, km.joined_at`,
		)
		.bind(kingdomId)
		.all<KingdomMember>();
	return rows.results;
}

export async function setMemberRole(
	db: D1Database,
	kingdomId: number,
	userId: number,
	role: KingdomRole,
): Promise<void> {
	await db
		.prepare(
			"UPDATE kingdom_members SET role = ? WHERE kingdom_id = ? AND user_id = ?",
		)
		.bind(role, kingdomId, userId)
		.run();
}

export async function freezeMembership(
	db: D1Database,
	kingdomId: number,
	userId: number,
): Promise<void> {
	await db
		.prepare(
			"UPDATE kingdom_members SET status = 'frozen', frozen_at = unixepoch() WHERE kingdom_id = ? AND user_id = ?",
		)
		.bind(kingdomId, userId)
		.run();
}

/**
 * Does the member's governor_id appear in the target kingdom's data?
 * Gate for transfers: we check the active version of each of the kingdom's KvKs.
 */
export async function governorExistsInKingdom(
	db: D1Database,
	kingdomId: number,
	governorId: number,
): Promise<boolean> {
	const row = await db
		.prepare(
			`SELECT 1 FROM player_data pd
			 JOIN kvks k ON k.active_version_id = pd.version_id
			 WHERE k.kingdom_id = ? AND pd.governor_id = ? LIMIT 1`,
		)
		.bind(kingdomId, governorId)
		.first();
	return !!row;
}

/**
 * Copy a member's farm-account links into the target kingdom.
 * Source = the member's links in the OLD kingdom (kvk_account_links across that
 * kingdom's KvKs) plus any global account_links. Target = each KvK in the new
 * kingdom that has an active version containing that governor_id. Old links are
 * left intact (they freeze with the old membership).
 */
async function carryFarmLinks(
	db: D1Database,
	userId: number,
	fromKingdomId: number | null,
	toKingdomId: number,
): Promise<void> {
	const farmRows = await db
		.prepare(
			`SELECT DISTINCT governor_id FROM (
				SELECT kal.governor_id
				FROM kvk_account_links kal JOIN kvks k ON kal.kvk_id = k.id
				WHERE kal.user_id = ? AND (? IS NULL OR k.kingdom_id = ?)
				UNION
				SELECT governor_id FROM account_links WHERE user_id = ?
			)`,
		)
		.bind(userId, fromKingdomId, fromKingdomId, userId)
		.all<{ governor_id: number }>();

	const govIds = farmRows.results.map((r) => r.governor_id);
	if (govIds.length === 0) return;

	const kvks = await db
		.prepare(
			"SELECT id, active_version_id FROM kvks WHERE kingdom_id = ? AND active_version_id IS NOT NULL",
		)
		.bind(toKingdomId)
		.all<{ id: number; active_version_id: number }>();

	for (const kvk of kvks.results) {
		for (const gid of govIds) {
			const exists = await db
				.prepare(
					"SELECT 1 FROM player_data WHERE version_id = ? AND governor_id = ? LIMIT 1",
				)
				.bind(kvk.active_version_id, gid)
				.first();
			if (!exists) continue;
			await db
				.prepare(
					"INSERT OR IGNORE INTO kvk_account_links (kvk_id, user_id, governor_id, created_by) VALUES (?, ?, ?, ?)",
				)
				.bind(kvk.id, userId, gid, userId)
				.run();
		}
	}
}

/**
 * Move a member to another kingdom. Freezes their current active membership,
 * activates (or creates) the target membership, and carries farm links over.
 * The caller is responsible for recomputing target scores (calculateScores).
 */
export async function transferMembership(
	db: D1Database,
	opts: {
		userId: number;
		governorId: number;
		fromKingdomId: number | null;
		toKingdomId: number;
		role: "r4" | "member";
		actorId: number;
	},
): Promise<void> {
	const { userId, governorId, fromKingdomId, toKingdomId, role, actorId } = opts;

	// 1. Freeze every active membership for this user (enforces single-active).
	await db
		.prepare(
			"UPDATE kingdom_members SET status = 'frozen', frozen_at = unixepoch() WHERE user_id = ? AND status = 'active'",
		)
		.bind(userId)
		.run();

	// 2. Activate or create the membership in the target kingdom.
	const existing = await db
		.prepare(
			"SELECT id FROM kingdom_members WHERE kingdom_id = ? AND user_id = ?",
		)
		.bind(toKingdomId, userId)
		.first<{ id: number }>();

	if (existing) {
		await db
			.prepare(
				"UPDATE kingdom_members SET status = 'active', role = ?, frozen_at = NULL, joined_at = unixepoch() WHERE id = ?",
			)
			.bind(role, existing.id)
			.run();
	} else {
		await db
			.prepare(
				`INSERT INTO kingdom_members (kingdom_id, user_id, governor_id, role, status, joined_at, invited_by)
				 VALUES (?, ?, ?, ?, 'active', unixepoch(), ?)`,
			)
			.bind(toKingdomId, userId, governorId, role, actorId)
			.run();
	}

	// 3. Carry farm-account links into the target kingdom.
	await carryFarmLinks(db, userId, fromKingdomId, toKingdomId);
}

export interface PendingTransfer {
	id: number;
	user_id: number;
	governor_id: number;
	from_kingdom_id: number | null;
	to_kingdom_id: number;
	role: "r4" | "member";
}

/**
 * Resolve an approved/accepted transfer: move the membership, mark the transfer
 * approved, and recompute scores for every active version in the target kingdom
 * (the new member's farm links can change contributions). Used by both the
 * King-approves-request path and the member-accepts-invite path.
 */
export async function applyTransfer(
	db: D1Database,
	transfer: PendingTransfer,
	actorId: number,
): Promise<void> {
	await transferMembership(db, {
		userId: transfer.user_id,
		governorId: transfer.governor_id,
		fromKingdomId: transfer.from_kingdom_id,
		toKingdomId: transfer.to_kingdom_id,
		role: transfer.role,
		actorId,
	});

	await db
		.prepare(
			"UPDATE kingdom_transfers SET status = 'approved', resolved_by = ?, resolved_at = unixepoch() WHERE id = ?",
		)
		.bind(actorId, transfer.id)
		.run();

	const kvks = await db
		.prepare(
			"SELECT active_version_id FROM kvks WHERE kingdom_id = ? AND active_version_id IS NOT NULL",
		)
		.bind(transfer.to_kingdom_id)
		.all<{ active_version_id: number }>();
	for (const k of kvks.results) {
		await calculateScores(db, k.active_version_id);
	}
}
