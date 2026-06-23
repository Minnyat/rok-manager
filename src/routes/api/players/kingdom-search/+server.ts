import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getDb } from "$lib/server/db";

export const GET: RequestHandler = async ({ url, platform, locals }) => {
	if (!locals.user) return json([], { status: 401 });

	const q = url.searchParams.get("q")?.trim();
	if (!q || q.length < 2) return json([]);

	const kingdomId = locals.user.kingdomId;
	if (!kingdomId) return json([]);

	const db = getDb(platform);
	const isNumeric = /^\d+$/.test(q);

	// Search across all active versions of this kingdom's KvKs.
	const results = isNumeric
		? await db
				.prepare(
					`SELECT pd.governor_id, pd.governor_name, MAX(pd.power) AS power
					 FROM player_data pd
					 JOIN kvks k ON pd.version_id = k.active_version_id
					 WHERE k.kingdom_id = ? AND CAST(pd.governor_id AS TEXT) LIKE ?
					 GROUP BY pd.governor_id
					 ORDER BY power DESC LIMIT 10`,
				)
				.bind(kingdomId, `${q}%`)
				.all()
		: await db
				.prepare(
					`SELECT pd.governor_id, pd.governor_name, MAX(pd.power) AS power
					 FROM player_data pd
					 JOIN kvks k ON pd.version_id = k.active_version_id
					 WHERE k.kingdom_id = ? AND pd.governor_name LIKE ?
					 GROUP BY pd.governor_id
					 ORDER BY power DESC LIMIT 10`,
				)
				.bind(kingdomId, `%${q}%`)
				.all();

	return json(results.results);
};
