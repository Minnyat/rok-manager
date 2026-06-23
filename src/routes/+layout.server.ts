import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import { getDb } from "$lib/server/db";
import { getKvks, getSelectedKvk } from "$lib/server/kvk";
import { getKingdomById } from "$lib/server/kingdom";

export const load: LayoutServerLoad = async ({ locals, platform, url }) => {
	// A user holding a one-time password must set a new one before doing anything
	// else. Gate every page nav except /settings itself (logout is an API route,
	// so it isn't caught here).
	if (locals.user?.mustChangePassword && url.pathname !== "/settings") {
		throw redirect(303, "/settings");
	}

	let kvks: any[] = [];
	let selectedKvk: any = null;
	let kingdom: any = null;

	if (locals.user && platform) {
		try {
			const db = getDb(platform);
			const kingdomId = locals.user.kingdomId;
			kvks = await getKvks(db, kingdomId);
			selectedKvk = await getSelectedKvk(db, url, kingdomId);
			if (kingdomId) kingdom = await getKingdomById(db, kingdomId);
		} catch {
			// KvK / kingdom tables may not exist yet
		}
	}

	return {
		user: locals.user,
		lang: locals.lang ?? "vi",
		kvks,
		selectedKvk,
		kingdom,
	};
};
