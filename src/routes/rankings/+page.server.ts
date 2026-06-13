import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals, platform, url }) => {
	if (!locals.user) throw redirect(303, '/login');

	const db = getDb(platform);

	const activeVersion = await db
		.prepare('SELECT id, name FROM data_versions WHERE is_active = 1 LIMIT 1')
		.first<{ id: number; name: string }>();

	if (!activeVersion) return { players: [], versionName: null, sort: 'ranking', dir: 'asc', view: 'combined' };

	const sort = url.searchParams.get('sort') || 'rank_combined';
	const dir = url.searchParams.get('dir') || 'asc';
	const view = url.searchParams.get('view') || 'combined';
	const pageNum = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
	const perPage = 50;

	const allowedSorts: Record<string, string> = {
		ranking: 'p.ranking',
		power: 'p.power',
		kp: 'p.kp',
		t4: 'p.t4',
		t5: 'p.t5',
		dead: 'p.dead',
		dead_t4: 'p.dead_t4',
		dead_t5: 'p.dead_t5',
		dkp: 'p.dkp',
		dkp_raw: 's.dkp_raw',
		dkp_combined: 's.dkp_combined',
		rank_individual: 's.rank_individual',
		rank_combined: 's.rank_combined',
		feeding_rate: 'p.feeding_rate'
	};

	const sortCol = allowedSorts[sort] || (view === 'combined' ? 's.rank_combined' : 's.rank_individual');
	const sortDir = dir === 'desc' ? 'DESC' : 'ASC';

	const totalResult = await db
		.prepare(
			`SELECT COUNT(*) as count
			 FROM player_data p
			 WHERE p.version_id = ?`
		)
		.bind(activeVersion.id)
		.first<{ count: number }>();

	const total = totalResult?.count ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / perPage));
	const offset = (Math.min(pageNum, totalPages) - 1) * perPage;

	const players = await db
		.prepare(
			`SELECT p.*, s.dkp_raw, s.dkp_combined, s.rank_individual, s.rank_combined, s.farm_contribution,
			        COALESCE(u.dkp_bonus_pct, 0) AS bonus_pct
			 FROM player_data p
			 LEFT JOIN player_scores s ON s.version_id = p.version_id AND s.governor_id = p.governor_id
			 LEFT JOIN users u ON u.main_governor_id = p.governor_id
			 WHERE p.version_id = ?
			 ORDER BY ${sortCol} ${sortDir}
			 LIMIT ? OFFSET ?`
		)
		.bind(activeVersion.id, perPage, offset)
		.all();

	return {
		players: players.results,
		versionName: activeVersion.name,
		sort,
		dir,
		view,
		page: Math.min(pageNum, totalPages),
		totalPages,
		total
	};
};
