import type { PageServerLoad } from "./$types";
import { getDb } from "$lib/server/db";

export const load: PageServerLoad = async ({ platform, parent }) => {
	const db = getDb(platform);
	const { kvk, stats, activeVersion } = await parent();

	// Load versions for this KvK
	const versions = await db
		.prepare(
			"SELECT id, name, filename, row_count, imported_at FROM data_versions WHERE kvk_id = ? ORDER BY imported_at DESC",
		)
		.bind(kvk.id)
		.all();

	return {
		kvk,
		stats,
		activeVersion,
		versions: versions.results,
	};
};
