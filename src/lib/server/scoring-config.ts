export interface ScoringConfig {
	t4_kill_weight: number;
	t5_kill_weight: number;
	dead_t4_weight: number;
	dead_t5_weight: number;
	farm_contribution_pct: number;
}

export const SCORING_DEFAULTS: ScoringConfig = {
	t4_kill_weight: 1,
	t5_kill_weight: 3,
	dead_t4_weight: 2,
	dead_t5_weight: 4,
	farm_contribution_pct: 40,
};

export const SCORING_KEYS = Object.keys(
	SCORING_DEFAULTS,
) as (keyof ScoringConfig)[];

export const SCORING_LABELS: Record<keyof ScoringConfig, string> = {
	t4_kill_weight: "T4 Kill Weight",
	t5_kill_weight: "T5 Kill Weight",
	dead_t4_weight: "Dead T4 Weight",
	dead_t5_weight: "Dead T5 Weight",
	farm_contribution_pct: "Farm Contribution %",
};

/**
 * Load scoring config for a KvK.
 * Priority: kvk_scoring_config → global scoring_config → code defaults.
 */
export async function loadScoringConfig(
	db: D1Database,
	kvkId?: number,
): Promise<ScoringConfig> {
	const config = { ...SCORING_DEFAULTS };

	// Try KvK-specific config first
	if (kvkId) {
		try {
			const kvkRows = await db
				.prepare("SELECT key, value FROM kvk_scoring_config WHERE kvk_id = ?")
				.bind(kvkId)
				.all<{ key: string; value: number }>();
			if (kvkRows.results.length > 0) {
				for (const row of kvkRows.results) {
					if (row.key in config) {
						(config as Record<string, number>)[row.key] = row.value;
					}
				}
				return config;
			}
		} catch {
			// kvk_scoring_config table may not exist yet
		}
	}

	// Fallback to global scoring_config
	const rows = await db
		.prepare("SELECT key, value FROM scoring_config")
		.all<{ key: string; value: number }>();
	for (const row of rows.results) {
		if (row.key in config) {
			(config as Record<string, number>)[row.key] = row.value;
		}
	}
	return config;
}

/**
 * Load scoring config with labels for admin UI.
 */
export async function loadScoringConfigWithLabels(
	db: D1Database,
	kvkId?: number,
) {
	// Try KvK-specific config first
	if (kvkId) {
		try {
			const kvkRows = await db
				.prepare(
					"SELECT key, value, label FROM kvk_scoring_config WHERE kvk_id = ?",
				)
				.bind(kvkId)
				.all<{ key: string; value: number; label: string }>();
			if (kvkRows.results.length > 0) {
				return SCORING_KEYS.map((key) => {
					const found = kvkRows.results.find((r) => r.key === key);
					return {
						key,
						value: found ? found.value : SCORING_DEFAULTS[key],
						label: found ? found.label : SCORING_LABELS[key],
					};
				});
			}
		} catch {
			// kvk_scoring_config table may not exist yet
		}
	}

	// Fallback to global
	const rows = await db
		.prepare("SELECT key, value, label FROM scoring_config")
		.all<{ key: string; value: number; label: string }>();

	// Merge with defaults so all keys are always present
	return SCORING_KEYS.map((key) => {
		const found = rows.results.find((r) => r.key === key);
		return {
			key,
			value: found ? found.value : SCORING_DEFAULTS[key],
			label: found ? found.label : SCORING_LABELS[key],
		};
	});
}

/**
 * Save a single scoring config field for a KvK.
 * Creates the row if it doesn't exist (UPSERT).
 */
export async function saveScoringConfigField(
	db: D1Database,
	kvkId: number,
	key: string,
	value: number,
	userId?: number,
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO kvk_scoring_config (kvk_id, key, value, label, updated_by, updated_at)
			 VALUES (?, ?, ?, ?, ?, unixepoch())
			 ON CONFLICT(kvk_id, key) DO UPDATE SET
			   value = excluded.value,
			   updated_by = excluded.updated_by,
			   updated_at = excluded.updated_at`,
		)
		.bind(
			kvkId,
			key,
			value,
			SCORING_LABELS[key as keyof ScoringConfig] ?? key,
			userId ?? null,
		)
		.run();
}

/**
 * Seed KvK scoring config from the global scoring_config table.
 * Used when creating a new KvK to copy defaults.
 */
export async function seedScoringConfigForKvk(
	db: D1Database,
	kvkId: number,
): Promise<void> {
	const globalRows = await db
		.prepare("SELECT key, value, label FROM scoring_config")
		.all<{ key: string; value: number; label: string }>();

	if (globalRows.results.length > 0) {
		const stmts = globalRows.results.map((r) =>
			db
				.prepare(
					`INSERT OR IGNORE INTO kvk_scoring_config (kvk_id, key, value, label, updated_at)
					 VALUES (?, ?, ?, ?, unixepoch())`,
				)
				.bind(kvkId, r.key, r.value, r.label),
		);
		await db.batch(stmts);
	} else {
		// No global config, seed from code defaults
		const stmts = SCORING_KEYS.map((key) =>
			db
				.prepare(
					`INSERT OR IGNORE INTO kvk_scoring_config (kvk_id, key, value, label, updated_at)
					 VALUES (?, ?, ?, ?, unixepoch())`,
				)
				.bind(kvkId, key, SCORING_DEFAULTS[key], SCORING_LABELS[key]),
		);
		await db.batch(stmts);
	}
}

/**
 * Copy scoring config from one KvK to another.
 */
export async function copyScoringConfig(
	db: D1Database,
	fromKvkId: number,
	toKvkId: number,
): Promise<void> {
	const rows = await db
		.prepare(
			"SELECT key, value, label FROM kvk_scoring_config WHERE kvk_id = ?",
		)
		.bind(fromKvkId)
		.all<{ key: string; value: number; label: string }>();

	if (rows.results.length === 0) return;

	const stmts = rows.results.map((r) =>
		db
			.prepare(
				`INSERT INTO kvk_scoring_config (kvk_id, key, value, label, updated_at)
				 VALUES (?, ?, ?, ?, unixepoch())
				 ON CONFLICT(kvk_id, key) DO UPDATE SET
				   value = excluded.value,
				   label = excluded.label,
				   updated_at = excluded.updated_at`,
			)
			.bind(toKvkId, r.key, r.value, r.label),
	);
	await db.batch(stmts);
}
