import { fail, redirect, error } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getDb } from "$lib/server/db";
import {
	getKingdomByNumber,
	getKingdomStats,
	getMembers,
	updateKingdom,
	setMemberRole,
} from "$lib/server/kingdom";
import { t, type Lang } from "$lib/i18n";

export const load: PageServerLoad = async ({ locals, platform, params }) => {
	if (locals.user?.role !== "admin") throw redirect(303, "/admin");

	const db = getDb(platform);
	const kingdom = await getKingdomByNumber(db, params.number);
	if (!kingdom) throw error(404, t(locals.lang, "err.kingdomNotFound"));

	const [stats, members] = await Promise.all([
		getKingdomStats(db, kingdom.id),
		getMembers(db, kingdom.id),
	]);

	// Pending transfers in/out of this kingdom (populated by the move flow).
	const transfers = await db
		.prepare(
			`SELECT kt.*, u.username
			 FROM kingdom_transfers kt JOIN users u ON u.id = kt.user_id
			 WHERE kt.status = 'pending' AND (kt.to_kingdom_id = ? OR kt.from_kingdom_id = ?)
			 ORDER BY kt.created_at DESC`,
		)
		.bind(kingdom.id, kingdom.id)
		.all();

	return { kingdom, stats, members, transfers: transfers.results };
};

async function loadKingdom(db: D1Database, number: string, lang: Lang) {
	const kingdom = await getKingdomByNumber(db, number);
	if (!kingdom) throw error(404, t(lang, "err.kingdomNotFound"));
	return kingdom;
}

export const actions: Actions = {
	updateSettings: async ({ request, locals, platform, params }) => {
		if (locals.user?.role !== "admin") return fail(403, { error: "Forbidden" });

		const db = getDb(platform);
		const kingdom = await loadKingdom(db, params.number, locals.lang);

		const form = await request.formData();
		const number = String(form.get("number") || "").trim();
		const displayName = String(form.get("displayName") || "").trim() || null;
		const quotaMb = Number(form.get("quotaMb"));
		const status = String(form.get("status") || "");
		const coinKeepPct = Number(form.get("coinKeepPct") ?? 100);

		if (!/^\d{3,5}$/.test(number)) {
			return fail(400, { error: t(locals.lang, "err.kingdomNumberFormat") });
		}
		if (!quotaMb || quotaMb < 1) {
			return fail(400, { error: t(locals.lang, "err.quotaMin1") });
		}
		if (!["active", "suspended", "archived"].includes(status)) {
			return fail(400, { error: t(locals.lang, "err.invalidStatus") });
		}
		if (!Number.isInteger(coinKeepPct) || coinKeepPct < 0 || coinKeepPct > 100) {
			return fail(400, { error: t(locals.lang, "auction.err.keepPct") });
		}

		// Number is UNIQUE across kingdoms — reject if another kingdom owns it.
		const clash = await getKingdomByNumber(db, number);
		if (clash && clash.id !== kingdom.id) {
			return fail(400, { error: t(locals.lang, "err.numberUsedByOther", { number }) });
		}

		await updateKingdom(db, kingdom.id, {
			number,
			display_name: displayName,
			storage_quota_mb: quotaMb,
			status,
			coin_keep_pct: coinKeepPct,
		});

		// This page is keyed by `number` in the URL — if it changed, move there.
		if (number !== kingdom.number) {
			throw redirect(303, `/admin/kingdoms/${number}`);
		}

		return { saved: true };
	},

	reassignKing: async ({ request, locals, platform, params }) => {
		if (locals.user?.role !== "admin") return fail(403, { error: "Forbidden" });

		const db = getDb(platform);
		const kingdom = await loadKingdom(db, params.number, locals.lang);

		const form = await request.formData();
		const userId = Number(form.get("userId"));
		if (!userId) return fail(400, { error: t(locals.lang, "err.missingUser") });

		// Target must be an active member of this kingdom.
		const member = await db
			.prepare(
				"SELECT user_id FROM kingdom_members WHERE kingdom_id = ? AND user_id = ? AND status = 'active'",
			)
			.bind(kingdom.id, userId)
			.first();
		if (!member) {
			return fail(400, { error: t(locals.lang, "err.notActiveMember") });
		}

		// Demote the current King (if any) to member, promote the target to King.
		if (kingdom.king_user_id && kingdom.king_user_id !== userId) {
			await setMemberRole(db, kingdom.id, kingdom.king_user_id, "member");
		}
		await setMemberRole(db, kingdom.id, userId, "king");
		await updateKingdom(db, kingdom.id, { king_user_id: userId });

		return { saved: true };
	},
};
