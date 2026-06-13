import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';

export const GET: RequestHandler = async ({ url, platform, locals }) => {
	if (!locals.user || locals.user.role === 'player') {
		return json([]);
	}

	const q = url.searchParams.get('q')?.trim();
	if (!q || q.length < 2) return json([]);

	const db = getDb(platform);

	const activeVersion = await db
		.prepare('SELECT id FROM data_versions WHERE is_active = 1 LIMIT 1')
		.first<{ id: number }>();

	if (!activeVersion) return json([]);

	const isNumeric = /^\d+$/.test(q);
	const results = isNumeric
		? await db
				.prepare(
					`SELECT DISTINCT governor_id, governor_name, power
					 FROM player_data
					 WHERE version_id = ? AND CAST(governor_id AS TEXT) LIKE ?
					 ORDER BY power DESC LIMIT 10`
				)
				.bind(activeVersion.id, `${q}%`)
				.all()
		: await db
				.prepare(
					`SELECT DISTINCT governor_id, governor_name, power
					 FROM player_data
					 WHERE version_id = ? AND governor_name LIKE ?
					 ORDER BY power DESC LIMIT 10`
				)
				.bind(activeVersion.id, `%${q}%`)
				.all();

	return json(results.results);
};
