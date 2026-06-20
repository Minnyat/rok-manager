import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getDb } from "$lib/server/db";
import { getSelectedKvk, getActiveVersionForKvk } from "$lib/server/kvk";

export const GET: RequestHandler = async ({ url, platform, locals }) => {
	if (!locals.user) return json({ results: [] }, { status: 401 });

	const q = url.searchParams.get("q")?.trim();
	if (!q || q.length < 2) return json({ results: [] });

	const db = getDb(platform);

	// Support kvkId param, otherwise use selected KvK
	const kvkIdParam = url.searchParams.get("kvkId");
	let activeVersion: { id: number } | null = null;

	if (kvkIdParam) {
		const kvkId = Number(kvkIdParam);
		if (!isNaN(kvkId)) {
			activeVersion = await getActiveVersionForKvk(db, kvkId);
		}
	}

	if (!activeVersion) {
		const kvk = await getSelectedKvk(db, url);
		if (kvk) {
			activeVersion = await getActiveVersionForKvk(db, kvk.id);
		}
	}

	if (!activeVersion) return json({ results: [] });

	const isNumeric = /^\d+$/.test(q);
	let results;

	if (isNumeric) {
		results = await db
			.prepare(
				"SELECT governor_id, governor_name, power FROM player_data WHERE version_id = ? AND CAST(governor_id AS TEXT) LIKE ? LIMIT 10",
			)
			.bind(activeVersion.id, `${q}%`)
			.all();
	} else {
		results = await db
			.prepare(
				"SELECT governor_id, governor_name, power FROM player_data WHERE version_id = ? AND governor_name LIKE ? LIMIT 10",
			)
			.bind(activeVersion.id, `%${q}%`)
			.all();
	}

	return json({ results: results.results });
};
