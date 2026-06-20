import type { LayoutServerLoad } from "./$types";
import { getDb } from "$lib/server/db";
import { getKvks, getSelectedKvk } from "$lib/server/kvk";

export const load: LayoutServerLoad = async ({ locals, platform, url }) => {
	let kvks: any[] = [];
	let selectedKvk: any = null;

	if (locals.user && platform) {
		try {
			const db = getDb(platform);
			kvks = await getKvks(db);
			selectedKvk = await getSelectedKvk(db, url);
		} catch {
			// KvK tables may not exist yet
		}
	}

	return {
		user: locals.user,
		lang: locals.lang ?? "vi",
		kvks,
		selectedKvk,
	};
};
