import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getDb } from "$lib/server/db";
import { getKvks, getActiveVersionForKvk } from "$lib/server/kvk";

export const load: PageServerLoad = async ({ locals, platform, params }) => {
	if (!locals.user) throw redirect(303, "/login");

	const db = getDb(platform);
	const governorId = Number(params.governorId);

	if (isNaN(governorId) || governorId <= 0) {
		return { governorId, governorName: null, kvkHistory: [], summary: null };
	}

	const kvks = await getKvks(db, locals.user.kingdomId);
	const kvkHistory: {
		kvkId: number;
		kvkName: string;
		kvkStatus: string;
		versionId: number | null;
		versionName: string | null;
		player: any;
		scores: any;
		bonus: any;
		farms: { governor_id: number; governor_name: string }[];
	}[] = [];

	let governorName: string | null = null;

	for (const kvk of kvks) {
		const activeVersion = await getActiveVersionForKvk(db, kvk.id);

		let player = null;
		let scores = null;
		let bonus = null;
		let farms: { governor_id: number; governor_name: string }[] = [];

		if (activeVersion) {
			player = await db
				.prepare(
					"SELECT * FROM player_data WHERE version_id = ? AND governor_id = ? LIMIT 1",
				)
				.bind(activeVersion.id, governorId)
				.first();

			if (player && !governorName) {
				governorName = (player as any).governor_name;
			}

			if (player) {
				scores = await db
					.prepare(
						`SELECT dkp_raw, dkp_combined, rank_individual, rank_combined,
						        farm_contribution, dkp_base, bonus_pct, bonus_amount
						 FROM player_scores WHERE version_id = ? AND governor_id = ? LIMIT 1`,
					)
					.bind(activeVersion.id, governorId)
					.first();

				// Check bonus
				try {
					bonus = await db
						.prepare(
							"SELECT bonus_pct, note FROM kvk_bonus_recipients WHERE kvk_id = ? AND governor_id = ? LIMIT 1",
						)
						.bind(kvk.id, governorId)
						.first();
				} catch {
					// Table may not exist
				}

				// Check if this governor has farm accounts linked
				try {
					const farmLinks = await db
						.prepare(
							`SELECT kal.governor_id, pd.governor_name
							 FROM kvk_account_links kal
							 JOIN users u ON u.id = kal.user_id
							 JOIN player_data pd ON pd.version_id = ? AND pd.governor_id = kal.governor_id
							 WHERE kal.kvk_id = ? AND u.main_governor_id = ?`,
						)
						.bind(activeVersion.id, kvk.id, governorId)
						.all<{ governor_id: number; governor_name: string }>();
					farms = farmLinks.results;
				} catch {
					// Fallback to global account_links
					const globalFarms = await db
						.prepare(
							`SELECT al.governor_id, pd.governor_name
							 FROM account_links al
							 JOIN users u ON u.id = al.user_id
							 JOIN player_data pd ON pd.version_id = ? AND pd.governor_id = al.governor_id
							 WHERE u.main_governor_id = ?`,
						)
						.bind(activeVersion.id, governorId)
						.all<{ governor_id: number; governor_name: string }>();
					farms = globalFarms.results;
				}
			}
		}

		// Only include KvK where this player has data
		if (player) {
			kvkHistory.push({
				kvkId: kvk.id,
				kvkName: kvk.name,
				kvkStatus: kvk.status,
				versionId: activeVersion?.id ?? null,
				versionName: activeVersion?.name ?? null,
				player,
				scores,
				bonus,
				farms,
			});
		}
	}

	// Calculate summary
	let summary = null;
	if (kvkHistory.length > 0) {
		let totalDkpBase = 0;
		let totalBonusAmount = 0;
		let totalFarmContribution = 0;
		let totalCombined = 0;
		let bestRank: number | null = null;
		let bestKvk = "";

		for (const h of kvkHistory) {
			if (h.scores) {
				totalDkpBase += h.scores.dkp_base ?? 0;
				totalBonusAmount += h.scores.bonus_amount ?? 0;
				totalFarmContribution += h.scores.farm_contribution ?? 0;
				totalCombined += h.scores.dkp_combined ?? 0;
				const rank = h.scores.rank_combined;
				if (rank && (bestRank === null || rank < bestRank)) {
					bestRank = rank;
					bestKvk = h.kvkName;
				}
			}
		}

		summary = {
			participationCount: kvkHistory.length,
			totalDkpBase,
			totalBonusAmount,
			totalFarmContribution,
			totalCombined,
			bestRank,
			bestKvk,
		};
	}

	return { governorId, governorName, kvkHistory, summary };
};
