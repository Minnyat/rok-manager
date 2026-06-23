import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getDb } from "$lib/server/db";
import { t } from "$lib/i18n";
import { isAdmin } from "$lib/server/permissions";

export const load: PageServerLoad = async ({ platform, locals }) => {
	// System-admin only (the rank table is shared by every kingdom).
	if (!isAdmin(locals.user)) throw redirect(303, "/admin");
	const db = getDb(platform);
	const rows = await db
		.prepare("SELECT rank, sculptures FROM mge_rank_rewards ORDER BY rank ASC")
		.all<{ rank: number; sculptures: number }>();
	return { rewards: rows.results };
};

export const actions: Actions = {
	save: async ({ request, platform, locals }) => {
		if (!isAdmin(locals.user))
			return fail(403, { error: t(locals.lang, "err.forbidden") });
		const db = getDb(platform);
		const form = await request.formData();

		const stmts: D1PreparedStatement[] = [];
		for (let rank = 1; rank <= 15; rank++) {
			const raw = form.get(`rank_${rank}`);
			if (raw == null) continue;
			const sculptures = Number(raw);
			if (!Number.isInteger(sculptures) || sculptures < 0)
				return fail(400, { error: t(locals.lang, "auction.admin.err") });
			stmts.push(
				db
					.prepare(
						`INSERT INTO mge_rank_rewards (rank, sculptures) VALUES (?, ?)
						 ON CONFLICT(rank) DO UPDATE SET sculptures = excluded.sculptures`,
					)
					.bind(rank, sculptures),
			);
		}
		if (stmts.length) await db.batch(stmts);
		return { saved: true };
	},
};
