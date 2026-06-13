import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) throw redirect(303, '/login');

	const db = getDb(platform);

	const activeVersion = await db
		.prepare('SELECT id, name FROM data_versions WHERE is_active = 1 LIMIT 1')
		.first<{ id: number; name: string }>();

	if (!activeVersion) {
		return { player: null, scores: null, subAccounts: [], versionName: null };
	}

	const player = await db
		.prepare('SELECT * FROM player_data WHERE version_id = ? AND governor_id = ? LIMIT 1')
		.bind(activeVersion.id, locals.user.mainGovernorId)
		.first();

	const scores = await db
		.prepare(
			`SELECT dkp_raw, dkp_combined, rank_individual, rank_combined, farm_contribution
			 FROM player_scores WHERE version_id = ? AND governor_id = ? LIMIT 1`
		)
		.bind(activeVersion.id, locals.user.mainGovernorId)
		.first();

	const links = await db
		.prepare('SELECT governor_id FROM account_links WHERE user_id = ?')
		.bind(locals.user.id)
		.all<{ governor_id: number }>();

	const subAccounts = [];
	for (const link of links.results) {
		const sub = await db
			.prepare('SELECT * FROM player_data WHERE version_id = ? AND governor_id = ? LIMIT 1')
			.bind(activeVersion.id, link.governor_id)
			.first();
		if (sub) {
			const subScore = await db
				.prepare('SELECT dkp_raw, rank_individual FROM player_scores WHERE version_id = ? AND governor_id = ? LIMIT 1')
				.bind(activeVersion.id, link.governor_id)
				.first();
			subAccounts.push({ ...sub, scores: subScore });
		}
	}

	return {
		player,
		scores,
		subAccounts,
		versionName: activeVersion.name
	};
};
