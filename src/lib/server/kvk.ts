/**
 * KvK (Kingdom vs Kingdom) server helpers.
 *
 * Every read path should go through getActiveVersionForKvk() instead of
 * the legacy global `data_versions.is_active = 1` query.
 */

export interface KvK {
	id: number;
	name: string;
	slug: string;
	description: string | null;
	status: "draft" | "active" | "archived";
	active_version_id: number | null;
	formula_type: string;
	formula_params: string; // JSON string
	kingdom_id: number | null;
	created_by: number | null;
	created_at: number;
	updated_at: number;
}

/**
 * List KvKs, newest first. Pass `kingdomId` to scope to one kingdom (the normal
 * case); omit it (or pass null) for the admin cross-kingdom view.
 */
export async function getKvks(
	db: D1Database,
	kingdomId?: number | null,
): Promise<KvK[]> {
	if (kingdomId != null) {
		const rows = await db
			.prepare("SELECT * FROM kvks WHERE kingdom_id = ? ORDER BY created_at DESC")
			.bind(kingdomId)
			.all<KvK>();
		return rows.results;
	}
	const rows = await db
		.prepare("SELECT * FROM kvks ORDER BY created_at DESC")
		.all<KvK>();
	return rows.results;
}

/** Get a single KvK by id. */
export async function getKvkById(
	db: D1Database,
	kvkId: number,
): Promise<KvK | null> {
	return db.prepare("SELECT * FROM kvks WHERE id = ?").bind(kvkId).first<KvK>();
}

/** Get a single KvK by slug. */
export async function getKvkBySlug(
	db: D1Database,
	slug: string,
): Promise<KvK | null> {
	return db
		.prepare("SELECT * FROM kvks WHERE slug = ?")
		.bind(slug)
		.first<KvK>();
}

/**
 * Get the "default" KvK — the newest one by creation date, scoped to a kingdom
 * when `kingdomId` is given. Users can switch to other KvKs via the KvK selector.
 */
export async function getDefaultKvk(
	db: D1Database,
	kingdomId?: number | null,
): Promise<KvK | null> {
	if (kingdomId != null) {
		return db
			.prepare(
				"SELECT * FROM kvks WHERE kingdom_id = ? ORDER BY created_at DESC LIMIT 1",
			)
			.bind(kingdomId)
			.first<KvK>();
	}
	return db
		.prepare("SELECT * FROM kvks ORDER BY created_at DESC LIMIT 1")
		.first<KvK>();
}

/**
 * Resolve which KvK the user is currently viewing.
 *
 * Priority:
 * 1. `?kvkId=` query param (must belong to the user's kingdom when scoped)
 * 2. Default KvK for the kingdom
 */
export async function getSelectedKvk(
	db: D1Database,
	url: URL,
	kingdomId?: number | null,
): Promise<KvK | null> {
	const paramId = url.searchParams.get("kvkId");
	if (paramId) {
		const id = Number(paramId);
		if (!isNaN(id) && id > 0) {
			const kvk = await getKvkById(db, id);
			// Enforce tenant scope: ignore a KvK outside the user's kingdom.
			if (kvk && (kingdomId == null || kvk.kingdom_id === kingdomId)) return kvk;
		}
	}
	return getDefaultKvk(db, kingdomId);
}

/**
 * Get the active data version for a given KvK.
 * Returns null if the KvK has no active version.
 */
export async function getActiveVersionForKvk(
	db: D1Database,
	kvkId: number,
): Promise<{ id: number; name: string } | null> {
	const kvk = await db
		.prepare("SELECT active_version_id FROM kvks WHERE id = ?")
		.bind(kvkId)
		.first<{ active_version_id: number | null }>();

	if (!kvk || !kvk.active_version_id) return null;

	return db
		.prepare("SELECT id, name FROM data_versions WHERE id = ?")
		.bind(kvk.active_version_id)
		.first<{ id: number; name: string }>();
}

/**
 * Set the active version for a KvK.
 * This is the ONLY way to activate a version in the new system.
 * Does NOT touch the global `data_versions.is_active`.
 */
export async function setActiveVersionForKvk(
	db: D1Database,
	kvkId: number,
	versionId: number,
): Promise<void> {
	await db
		.prepare(
			"UPDATE kvks SET active_version_id = ?, updated_at = unixepoch() WHERE id = ?",
		)
		.bind(versionId, kvkId)
		.run();
}

/**
 * Create a new KvK.
 * Returns the new KvK id.
 */
export async function createKvk(
	db: D1Database,
	name: string,
	slug: string,
	description: string | null,
	userId: number,
	kingdomId: number | null = null,
): Promise<number> {
	const result = await db
		.prepare(
			`INSERT INTO kvks (name, slug, description, status, formula_type, formula_params, kingdom_id, created_by, created_at, updated_at)
			 VALUES (?, ?, ?, 'draft', 'dkp', '{}', ?, ?, unixepoch(), unixepoch())`,
		)
		.bind(name, slug, description, kingdomId, userId)
		.run();
	return result.meta.last_row_id as number;
}

/**
 * Turn a human KvK name into a URL slug. Strips Vietnamese diacritics and any
 * non-alphanumeric characters. Returns "" when nothing usable remains (e.g. a
 * fully non-latin name) — callers should fall back to an id-based slug.
 */
export function slugify(name: string): string {
	return name
		.toLowerCase()
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

/**
 * Update KvK fields (name, slug, description, status, formula_type, formula_params).
 */
export async function updateKvk(
	db: D1Database,
	kvkId: number,
	fields: {
		name?: string;
		slug?: string;
		description?: string;
		status?: string;
		formula_type?: string;
		formula_params?: string;
	},
): Promise<void> {
	const sets: string[] = [];
	const values: (string | number)[] = [];

	if (fields.name !== undefined) {
		sets.push("name = ?");
		values.push(fields.name);
	}
	if (fields.slug !== undefined) {
		sets.push("slug = ?");
		values.push(fields.slug);
	}
	if (fields.description !== undefined) {
		sets.push("description = ?");
		values.push(fields.description);
	}
	if (fields.status !== undefined) {
		sets.push("status = ?");
		values.push(fields.status);
	}
	if (fields.formula_type !== undefined) {
		sets.push("formula_type = ?");
		values.push(fields.formula_type);
	}
	if (fields.formula_params !== undefined) {
		sets.push("formula_params = ?");
		values.push(fields.formula_params);
	}

	if (sets.length === 0) return;

	sets.push("updated_at = unixepoch()");
	values.push(kvkId);

	await db
		.prepare(`UPDATE kvks SET ${sets.join(", ")} WHERE id = ?`)
		.bind(...values)
		.run();
}

/**
 * Get KvK stats: number of versions, number of players in active version,
 * number of bonus recipients, last import date.
 */
export async function getKvkStats(
	db: D1Database,
	kvkId: number,
): Promise<{
	versionCount: number;
	playerCount: number;
	bonusCount: number;
	lastImport: number | null;
}> {
	const versionCount = await db
		.prepare("SELECT COUNT(*) as count FROM data_versions WHERE kvk_id = ?")
		.bind(kvkId)
		.first<{ count: number }>();

	const kvk = await db
		.prepare("SELECT active_version_id FROM kvks WHERE id = ?")
		.bind(kvkId)
		.first<{ active_version_id: number | null }>();

	let playerCount = 0;
	let lastImport: number | null = null;

	if (kvk?.active_version_id) {
		const pc = await db
			.prepare("SELECT COUNT(*) as count FROM player_data WHERE version_id = ?")
			.bind(kvk.active_version_id)
			.first<{ count: number }>();
		playerCount = pc?.count ?? 0;
	}

	const li = await db
		.prepare(
			"SELECT MAX(imported_at) as last FROM data_versions WHERE kvk_id = ?",
		)
		.bind(kvkId)
		.first<{ last: number | null }>();
	lastImport = li?.last ?? null;

	let bonusCount = 0;
	try {
		const bc = await db
			.prepare(
				"SELECT COUNT(*) as count FROM kvk_bonus_recipients WHERE kvk_id = ?",
			)
			.bind(kvkId)
			.first<{ count: number }>();
		bonusCount = bc?.count ?? 0;
	} catch {
		// Table may not exist yet (before migration 0005)
	}

	return {
		versionCount: versionCount?.count ?? 0,
		playerCount,
		bonusCount,
		lastImport,
	};
}

/**
 * Get the KvK id for a given data version.
 * Falls back to the default KvK if the version has no kvk_id.
 */
export async function getKvkForVersion(
	db: D1Database,
	versionId: number,
): Promise<KvK | null> {
	const version = await db
		.prepare("SELECT kvk_id FROM data_versions WHERE id = ?")
		.bind(versionId)
		.first<{ kvk_id: number | null }>();

	if (version?.kvk_id) {
		return getKvkById(db, version.kvk_id);
	}

	return getDefaultKvk(db);
}
