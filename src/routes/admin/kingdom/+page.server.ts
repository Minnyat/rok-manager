import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getDb } from "$lib/server/db";
import { t } from "$lib/i18n";
import { isKingdomManager, isKing } from "$lib/server/permissions";
import { getKingdomById, updateKingdom } from "$lib/server/kingdom";

export const load: PageServerLoad = async ({ platform, locals }) => {
	const db = getDb(platform);
	const kingdomId = locals.user?.kingdomId ?? null;
	if (kingdomId == null) {
		// System admins manage kingdoms via /admin/kingdoms.
		return { kingdom: null, isKing: false };
	}
	const kingdom = await getKingdomById(db, kingdomId);
	return { kingdom, isKing: locals.user?.kingdomRole === "king" };
};

export const actions: Actions = {
	updateInfo: async ({ request, platform, locals }) => {
		const user = locals.user!;
		if (!user.kingdomId || !isKing(user, user.kingdomId))
			return fail(403, { error: t(locals.lang, "err.onlyKingEditKingdom") });

		const form = await request.formData();
		const displayName = String(form.get("displayName") || "").trim() || null;

		const db = getDb(platform);
		await updateKingdom(db, user.kingdomId, { display_name: displayName });
		return { infoSaved: true };
	},

	update: async ({ request, platform, locals }) => {
		const db = getDb(platform);
		const kingdomId = locals.user?.kingdomId ?? null;
		if (kingdomId == null || !isKingdomManager(locals.user, kingdomId))
			return fail(403, { error: t(locals.lang, "err.forbidden") });

		const form = await request.formData();
		const coinKeepPct = Number(form.get("coinKeepPct") ?? 100);
		if (!Number.isInteger(coinKeepPct) || coinKeepPct < 0 || coinKeepPct > 100)
			return fail(400, { error: t(locals.lang, "auction.err.keepPct") });

		await updateKingdom(db, kingdomId, { coin_keep_pct: coinKeepPct });
		return { saved: true };
	},
};
