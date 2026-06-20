/**
 * Score calculation engine.
 *
 * Uses Formula Registry to calculate dkp_base, then applies bonus and farm
 * contribution on top.
 *
 * Flow:
 * 1. Resolve KvK from version_id
 * 2. Get formula type + params from KvK
 * 3. Formula.calculate() → dkp_base per player
 * 4. Apply bonus from kvk_bonus_recipients
 * 5. Apply farm contribution from kvk_account_links
 * 6. Update ranks
 */

import { requireFormula, validateParams } from "./formulas/registry";
import { getKvkForVersion } from "./kvk";

// Import all formulas (auto-register)
import "./formulas/dkp";
import "./formulas/ffa";
import "./formulas/weighted-kill";
import "./formulas/custom";

/**
 * Calculate scores for a data version.
 *
 * @returns number of players scored
 */
export async function calculateScores(
	db: D1Database,
	versionId: number,
): Promise<number> {
	// 1. Resolve KvK for this version
	const kvk = await getKvkForVersion(db, versionId);
	const kvkId = kvk?.id;

	// 2. Get formula
	const formulaId = kvk?.formula_type ?? "dkp";
	const formula = requireFormula(formulaId);

	// 3. Parse and validate params
	const rawParams = kvk?.formula_params ? JSON.parse(kvk.formula_params) : {};
	const params = validateParams(formulaId, rawParams);

	// Extract farm_contribution_pct from params (standard across all formulas)
	const farmContributionPct =
		Number(rawParams.farm_contribution_pct ?? rawParams.farm_pct ?? 40) / 100;

	// 4. Load player data with required columns
	const columns = ["governor_id", ...formula.requiredColumns].join(", ");

	const players = await db
		.prepare(`SELECT ${columns} FROM player_data WHERE version_id = ?`)
		.bind(versionId)
		.all<Record<string, number>>();

	if (!players.results.length) return 0;

	const data = players.results;

	// Clear old scores
	await db
		.prepare("DELETE FROM player_scores WHERE version_id = ?")
		.bind(versionId)
		.run();

	// 5. Calculate dkp_base using formula
	const results = formula.calculate(data, params);

	// Build maps for later stages
	const scoreMap = new Map<number, number>();
	const baseMap = new Map<number, number>();

	const BATCH_SIZE = 40;

	// Insert base scores
	for (let i = 0; i < results.length; i += BATCH_SIZE) {
		const batch = results.slice(i, i + BATCH_SIZE);
		const stmts = batch.map((r) => {
			baseMap.set(r.governor_id, r.dkp_base);
			scoreMap.set(r.governor_id, r.dkp_base);
			return db
				.prepare(
					`INSERT INTO player_scores (version_id, governor_id, dkp_raw, dkp_combined, dkp_base, bonus_pct, bonus_amount)
					 VALUES (?, ?, ?, ?, ?, 0, 0)`,
				)
				.bind(versionId, r.governor_id, r.dkp_base, r.dkp_base, r.dkp_base);
		});
		await db.batch(stmts);
	}

	// 6. Apply bonus from kvk_bonus_recipients
	let bonusRecipients: { governor_id: number; bonus_pct: number }[] = [];

	if (kvkId) {
		try {
			const bonusRows = await db
				.prepare(
					"SELECT governor_id, bonus_pct FROM kvk_bonus_recipients WHERE kvk_id = ?",
				)
				.bind(kvkId)
				.all<{ governor_id: number; bonus_pct: number }>();
			bonusRecipients = bonusRows.results;
		} catch {
			// kvk_bonus_recipients table may not exist yet, fallback to legacy
		}
	}

	// Legacy fallback: use users.dkp_bonus_pct if no KvK bonus found
	if (bonusRecipients.length === 0 && !kvkId) {
		const legacyBonus = await db
			.prepare(
				`SELECT main_governor_id, dkp_bonus_pct FROM users
				 WHERE dkp_bonus_pct != 0 AND main_governor_id > 0`,
			)
			.all<{ main_governor_id: number; dkp_bonus_pct: number }>();
		bonusRecipients = legacyBonus.results.map((u) => ({
			governor_id: u.main_governor_id,
			bonus_pct: u.dkp_bonus_pct,
		}));
	}

	if (bonusRecipients.length > 0) {
		const bonusUpdates: D1PreparedStatement[] = [];
		for (const b of bonusRecipients) {
			const base = baseMap.get(b.governor_id) ?? 0;
			const bonusAmount = (base * b.bonus_pct) / 100;
			const newRaw = base + bonusAmount;
			scoreMap.set(b.governor_id, newRaw);
			bonusUpdates.push(
				db
					.prepare(
						`UPDATE player_scores SET dkp_raw = ?, dkp_combined = ?, bonus_pct = ?, bonus_amount = ?
						 WHERE version_id = ? AND governor_id = ?`,
					)
					.bind(
						newRaw,
						newRaw,
						b.bonus_pct,
						bonusAmount,
						versionId,
						b.governor_id,
					),
			);
		}
		for (let i = 0; i < bonusUpdates.length; i += BATCH_SIZE) {
			await db.batch(bonusUpdates.slice(i, i + BATCH_SIZE));
		}
	}

	// 7. Farm contribution
	let farmLinks: {
		main_governor_id: number;
		farm_governor_id: number;
	}[] = [];

	// Try per-KvK account links first
	if (kvkId) {
		try {
			const kvkFarmRows = await db
				.prepare(
					`SELECT u.main_governor_id, kal.governor_id AS farm_governor_id
					 FROM kvk_account_links kal
					 JOIN users u ON u.id = kal.user_id
					 WHERE kal.kvk_id = ? AND u.main_governor_id > 0`,
				)
				.bind(kvkId)
				.all<{
					main_governor_id: number;
					farm_governor_id: number;
				}>();
			farmLinks = kvkFarmRows.results;
		} catch {
			// kvk_account_links table may not exist yet
		}
	}

	// Fallback to global account_links
	if (farmLinks.length === 0) {
		const globalFarm = await db
			.prepare(
				`SELECT u.main_governor_id, al.governor_id AS farm_governor_id
				 FROM account_links al
				 JOIN users u ON u.id = al.user_id
				 WHERE u.main_governor_id > 0`,
			)
			.all<{
				main_governor_id: number;
				farm_governor_id: number;
			}>();
		farmLinks = globalFarm.results;
	}

	if (farmLinks.length > 0 && farmContributionPct > 0) {
		const mainContributions = new Map<number, number>();

		for (const link of farmLinks) {
			const farmDkp = scoreMap.get(link.farm_governor_id) ?? 0;
			const contribution = farmDkp * farmContributionPct;
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
						 WHERE version_id = ? AND governor_id = ?`,
					)
					.bind(mainDkp + farmContrib, farmContrib, versionId, mainGovId),
			);
		}

		for (let i = 0; i < updates.length; i += BATCH_SIZE) {
			await db.batch(updates.slice(i, i + BATCH_SIZE));
		}
	}

	// 8. Update ranks
	await db
		.prepare(
			`UPDATE player_scores SET rank_individual = (
				SELECT COUNT(*) + 1 FROM player_scores p2
				WHERE p2.version_id = player_scores.version_id AND p2.dkp_raw > player_scores.dkp_raw
			) WHERE version_id = ?`,
		)
		.bind(versionId)
		.run();

	await db
		.prepare(
			`UPDATE player_scores SET rank_combined = (
				SELECT COUNT(*) + 1 FROM player_scores p2
				WHERE p2.version_id = player_scores.version_id AND p2.dkp_combined > player_scores.dkp_combined
			) WHERE version_id = ?`,
		)
		.bind(versionId)
		.run();

	return data.length;
}
