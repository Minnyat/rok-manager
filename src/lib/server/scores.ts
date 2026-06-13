import { loadScoringConfig } from './scoring-config';

interface RawPlayerData {
	governor_id: number;
	t4: number;
	t5: number;
	dead_t4: number;
	dead_t5: number;
}

export async function calculateScores(db: D1Database, versionId: number): Promise<number> {
	const config = await loadScoringConfig(db);

	const players = await db
		.prepare('SELECT governor_id, t4, t5, dead_t4, dead_t5 FROM player_data WHERE version_id = ?')
		.bind(versionId)
		.all<RawPlayerData>();

	if (!players.results.length) return 0;

	const data = players.results;

	await db.prepare('DELETE FROM player_scores WHERE version_id = ?').bind(versionId).run();

	const scoreMap = new Map<number, number>();

	const BATCH_SIZE = 40;
	for (let i = 0; i < data.length; i += BATCH_SIZE) {
		const batch = data.slice(i, i + BATCH_SIZE);
		const stmts = batch.map((p) => {
			const dkpRaw =
				p.t4 * config.t4_kill_weight +
				p.t5 * config.t5_kill_weight +
				p.dead_t4 * config.dead_t4_weight +
				p.dead_t5 * config.dead_t5_weight;
			scoreMap.set(p.governor_id, dkpRaw);
			return db
				.prepare(
					`INSERT INTO player_scores (version_id, governor_id, dkp_raw, dkp_combined)
					 VALUES (?, ?, ?, ?)`
				)
				.bind(versionId, p.governor_id, dkpRaw, dkpRaw);
		});
		await db.batch(stmts);
	}

	// Apply user bonus % (main account only, not farm)
	const bonusUsers = await db
		.prepare(
			`SELECT main_governor_id, dkp_bonus_pct FROM users
			 WHERE dkp_bonus_pct != 0 AND main_governor_id > 0`
		)
		.all<{ main_governor_id: number; dkp_bonus_pct: number }>();

	if (bonusUsers.results.length > 0) {
		const bonusUpdates: D1PreparedStatement[] = [];
		for (const u of bonusUsers.results) {
			const raw = scoreMap.get(u.main_governor_id) ?? 0;
			const bonus = raw * u.dkp_bonus_pct / 100;
			const newRaw = raw + bonus;
			scoreMap.set(u.main_governor_id, newRaw);
			bonusUpdates.push(
				db
					.prepare(
						`UPDATE player_scores SET dkp_raw = ?, dkp_combined = ?
						 WHERE version_id = ? AND governor_id = ?`
					)
					.bind(newRaw, newRaw, versionId, u.main_governor_id)
			);
		}
		for (let i = 0; i < bonusUpdates.length; i += BATCH_SIZE) {
			await db.batch(bonusUpdates.slice(i, i + BATCH_SIZE));
		}
	}

	// Farm contribution
	const farmLinks = await db
		.prepare(
			`SELECT u.main_governor_id, al.governor_id AS farm_governor_id
			 FROM account_links al
			 JOIN users u ON u.id = al.user_id
			 WHERE u.main_governor_id > 0`
		)
		.all<{ main_governor_id: number; farm_governor_id: number }>();

	if (farmLinks.results.length > 0) {
		const farmPct = config.farm_contribution_pct / 100;
		const mainContributions = new Map<number, number>();

		for (const link of farmLinks.results) {
			const farmDkp = scoreMap.get(link.farm_governor_id) ?? 0;
			const contribution = farmDkp * farmPct;
			const current = mainContributions.get(link.main_governor_id) ?? 0;
			mainContributions.set(link.main_governor_id, current + contribution);
		}

		const updates: D1PreparedStatement[] = [];
		for (const [mainGovId, farmContrib] of mainContributions) {
			const mainDkp = scoreMap.get(mainGovId) ?? 0;
			updates.push(
				db
					.prepare(
						`UPDATE player_scores SET dkp_combined = ?, farm_contribution = ?
						 WHERE version_id = ? AND governor_id = ?`
					)
					.bind(mainDkp + farmContrib, farmContrib, versionId, mainGovId)
			);
		}

		for (let i = 0; i < updates.length; i += BATCH_SIZE) {
			await db.batch(updates.slice(i, i + BATCH_SIZE));
		}
	}

	await db
		.prepare(
			`UPDATE player_scores SET rank_individual = (
				SELECT COUNT(*) + 1 FROM player_scores p2
				WHERE p2.version_id = player_scores.version_id AND p2.dkp_raw > player_scores.dkp_raw
			) WHERE version_id = ?`
		)
		.bind(versionId)
		.run();

	await db
		.prepare(
			`UPDATE player_scores SET rank_combined = (
				SELECT COUNT(*) + 1 FROM player_scores p2
				WHERE p2.version_id = player_scores.version_id AND p2.dkp_combined > player_scores.dkp_combined
			) WHERE version_id = ?`
		)
		.bind(versionId)
		.run();

	return data.length;
}
