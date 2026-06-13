export interface ScoringConfig {
	t4_kill_weight: number;
	t5_kill_weight: number;
	dead_t4_weight: number;
	dead_t5_weight: number;
	farm_contribution_pct: number;
}

const DEFAULTS: ScoringConfig = {
	t4_kill_weight: 1,
	t5_kill_weight: 3,
	dead_t4_weight: 2,
	dead_t5_weight: 4,
	farm_contribution_pct: 40
};

export async function loadScoringConfig(db: D1Database): Promise<ScoringConfig> {
	const rows = await db.prepare('SELECT key, value FROM scoring_config').all<{ key: string; value: number }>();
	const config = { ...DEFAULTS };
	for (const row of rows.results) {
		if (row.key in config) {
			(config as Record<string, number>)[row.key] = row.value;
		}
	}
	return config;
}

export async function loadScoringConfigWithLabels(db: D1Database) {
	const rows = await db
		.prepare('SELECT key, value, label FROM scoring_config')
		.all<{ key: string; value: number; label: string }>();
	return rows.results;
}

export async function saveScoringConfigField(db: D1Database, key: string, value: number): Promise<void> {
	await db
		.prepare('UPDATE scoring_config SET value = ?, updated_at = unixepoch() WHERE key = ?')
		.bind(value, key)
		.run();
}
