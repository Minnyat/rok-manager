import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getDb } from "$lib/server/db";
import { getSelectedKvk, getActiveVersionForKvk } from "$lib/server/kvk";

export const GET: RequestHandler = async ({ url, platform, locals }) => {
	// Privileged search: system admin OR a kingdom manager (King / R4). Note a
	// King/R4's *system* role is usually "player" — their elevated access comes
	// from kingdomRole, so we must NOT gate on user.role alone.
	const u = locals.user;
	if (!u) return json([]);
	const isManager =
		u.role === "admin" || u.kingdomRole === "king" || u.kingdomRole === "r4";
	if (!isManager) {
		return json([]);
	}

	const q = url.searchParams.get("q")?.trim();
	if (!q || q.length < 2) return json([]);

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
		const kvk = await getSelectedKvk(db, url, u.kingdomId);
		if (kvk) {
			activeVersion = await getActiveVersionForKvk(db, kvk.id);
		}
	}

	if (!activeVersion) return json([]);

	const isNumeric = /^\d+$/.test(q);
	const results = isNumeric
		? await db
				.prepare(
					`SELECT DISTINCT governor_id, governor_name, power
					 FROM player_data
					 WHERE version_id = ? AND CAST(governor_id AS TEXT) LIKE ?
					 ORDER BY power DESC LIMIT 10`,
				)
				.bind(activeVersion.id, `${q}%`)
				.all()
		: await db
				.prepare(
					`SELECT DISTINCT governor_id, governor_name, power
					 FROM player_data
					 WHERE version_id = ? AND governor_name LIKE ?
					 ORDER BY power DESC LIMIT 10`,
				)
				.bind(activeVersion.id, `%${q}%`)
				.all();

	return json(results.results);
};
