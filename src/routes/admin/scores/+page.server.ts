import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { calculateScores } from '$lib/server/scores';
import { loadScoringConfig, loadScoringConfigWithLabels, saveScoringConfigField } from '$lib/server/scoring-config';

export const load: PageServerLoad = async ({ platform }) => {
	const db = getDb(platform);

	const activeVersion = await db
		.prepare('SELECT id, name FROM data_versions WHERE is_active = 1 LIMIT 1')
		.first<{ id: number; name: string }>();

	const configFields = await loadScoringConfigWithLabels(db);

	if (!activeVersion) return { versionName: null, scores: [], hasScores: false, configFields };

	const scores = await db
		.prepare(
			`SELECT p.governor_name, p.governor_id, s.dkp_raw, s.dkp_combined,
			        s.rank_individual, s.rank_combined, s.farm_contribution
			 FROM player_scores s
			 JOIN player_data p ON p.version_id = s.version_id AND p.governor_id = s.governor_id
			 WHERE s.version_id = ?
			 ORDER BY s.rank_combined ASC
			 LIMIT 100`
		)
		.bind(activeVersion.id)
		.all();

	return {
		versionName: activeVersion.name,
		scores: scores.results,
		hasScores: scores.results.length > 0,
		configFields
	};
};

export const actions: Actions = {
	calculate: async ({ platform }) => {
		const db = getDb(platform);

		const activeVersion = await db
			.prepare('SELECT id FROM data_versions WHERE is_active = 1 LIMIT 1')
			.first<{ id: number }>();

		if (!activeVersion) return fail(400, { error: 'Chưa có phiên bản active' });

		const count = await calculateScores(db, activeVersion.id);
		return { success: true, count };
	},

	saveConfig: async ({ request, platform }) => {
		const db = getDb(platform);
		const formData = await request.formData();
		const key = formData.get('key') as string;
		const value = parseFloat(formData.get('value') as string);

		if (!key || isNaN(value)) return fail(400, { error: 'Giá trị không hợp lệ' });

		const validKeys = ['t4_kill_weight', 't5_kill_weight', 'dead_t4_weight', 'dead_t5_weight', 'farm_contribution_pct'];
		if (!validKeys.includes(key)) return fail(400, { error: 'Key không hợp lệ' });

		await saveScoringConfigField(db, key, value);

		// Auto-recalculate
		const activeVersion = await db
			.prepare('SELECT id FROM data_versions WHERE is_active = 1 LIMIT 1')
			.first<{ id: number }>();

		let count = 0;
		if (activeVersion) {
			count = await calculateScores(db, activeVersion.id);
		}

		return { configSaved: true, count };
	}
};
