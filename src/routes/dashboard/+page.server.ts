import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getDb } from "$lib/server/db";
import { getSelectedKvk, getActiveVersionForKvk } from "$lib/server/kvk";

export const load: PageServerLoad = async ({ locals, platform, url }) => {
	if (!locals.user) throw redirect(303, "/login");

	const db = getDb(platform);
	const kvk = await getSelectedKvk(db, url, locals.user.kingdomId);

	if (!kvk) {
		return {
			player: null,
			scores: null,
			subAccounts: [],
			versionName: null,
			kvk: null,
		};
	}

	const activeVersion = await getActiveVersionForKvk(db, kvk.id);

	if (!activeVersion) {
		return {
			player: null,
			scores: null,
			subAccounts: [],
			versionName: null,
			kvk,
		};
	}

	const player = await db
		.prepare(
			"SELECT * FROM player_data WHERE version_id = ? AND governor_id = ? LIMIT 1",
		)
		.bind(activeVersion.id, locals.user.mainGovernorId)
		.first();

	const scores = await db
		.prepare(
			`SELECT dkp_raw, dkp_combined, rank_individual, rank_combined, farm_contribution,
			        dkp_base, bonus_pct, bonus_amount
			 FROM player_scores WHERE version_id = ? AND governor_id = ? LIMIT 1`,
		)
		.bind(activeVersion.id, locals.user.mainGovernorId)
		.first();

	// Load sub accounts - try KvK-specific first, fallback to global
	let links: { governor_id: number }[] = [];
	try {
		const kvkLinks = await db
			.prepare(
				"SELECT governor_id FROM kvk_account_links WHERE kvk_id = ? AND user_id = ?",
			)
			.bind(kvk.id, locals.user.id)
			.all<{ governor_id: number }>();
		links = kvkLinks.results;
	} catch {
		// kvk_account_links may not exist yet
	}

	if (links.length === 0) {
		const globalLinks = await db
			.prepare("SELECT governor_id FROM account_links WHERE user_id = ?")
			.bind(locals.user.id)
			.all<{ governor_id: number }>();
		links = globalLinks.results;
	}

	const subAccounts = [];
	for (const link of links) {
		const sub = await db
			.prepare(
				"SELECT * FROM player_data WHERE version_id = ? AND governor_id = ? LIMIT 1",
			)
			.bind(activeVersion.id, link.governor_id)
			.first();
		if (sub) {
			const subScore = await db
				.prepare(
					"SELECT dkp_raw, rank_individual, dkp_base, bonus_pct, bonus_amount FROM player_scores WHERE version_id = ? AND governor_id = ? LIMIT 1",
				)
				.bind(activeVersion.id, link.governor_id)
				.first();
			subAccounts.push({ ...sub, scores: subScore });
		}
	}

	return {
		player,
		scores,
		subAccounts,
		versionName: activeVersion.name,
		kvk,
	};
};
