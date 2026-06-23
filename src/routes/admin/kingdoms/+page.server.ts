import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getDb } from "$lib/server/db";
import {
	getKingdoms,
	getKingdomStats,
	createKingdom,
	getKingdomByNumber,
} from "$lib/server/kingdom";
import { createInviteToken } from "$lib/server/auth";
import { t } from "$lib/i18n";

export const load: PageServerLoad = async ({ locals, platform, url }) => {
	// System admin only — Kings/R4 manage their own kingdom under /admin/members.
	if (locals.user?.role !== "admin") throw redirect(303, "/admin");

	const db = getDb(platform);
	const kingdoms = await getKingdoms(db);
	const stats = await Promise.all(kingdoms.map((k) => getKingdomStats(db, k.id)));

	return { kingdoms, stats, baseUrl: url.origin };
};

export const actions: Actions = {
	create: async ({ request, locals, platform, url }) => {
		if (locals.user?.role !== "admin") return fail(403, { error: "Forbidden" });

		const form = await request.formData();
		const number = String(form.get("number") || "").trim();
		const displayName = String(form.get("displayName") || "").trim() || null;
		const quotaMb = Number(form.get("quotaMb")) || 100;

		if (!/^\d{3,5}$/.test(number)) {
			return fail(400, { error: t(locals.lang, "err.kingdomNumberFormat") });
		}
		if (quotaMb < 1) {
			return fail(400, { error: t(locals.lang, "err.quotaMin1") });
		}

		const db = getDb(platform);

		const existing = await getKingdomByNumber(db, number);
		if (existing) {
			return fail(400, { error: t(locals.lang, "err.kingdomExists", { number }) });
		}

		const kingdomId = await createKingdom(
			db,
			number,
			displayName,
			quotaMb,
			locals.user.id,
		);

		// Invite the King as a standalone kingdom-management account — NOT tied to
		// a governor ID (governor 0 = placeholder, like the admin account).
		// Accepting the link creates the King membership and sets
		// kingdoms.king_user_id (see invite/[token]).
		const token = await createInviteToken(db, 0, "king", kingdomId, "king");

		return {
			success: true,
			inviteUrl: `${url.origin}/invite/${token}`,
			number,
		};
	},
};
