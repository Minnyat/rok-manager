import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getDb } from "$lib/server/db";
import { t } from "$lib/i18n";

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(303, "/dashboard");
};

export const actions: Actions = {
	default: async ({ request, platform, locals }) => {
		const form = await request.formData();
		const username = String(form.get("username") || "")
			.trim()
			.toLowerCase();
		const note = String(form.get("note") || "").trim() || null;

		if (!username) {
			return fail(400, { error: t(locals.lang, "err.enterUsername") });
		}

		const db = getDb(platform);
		const user = await db
			.prepare(
				"SELECT id, is_active FROM users WHERE LOWER(username) = ?",
			)
			.bind(username)
			.first<{ id: number; is_active: number }>();

		// Always report success — never reveal whether the username exists.
		if (user && user.is_active) {
			// Snapshot the requester's active kingdom so their King/R4 can route it.
			const membership = await db
				.prepare(
					"SELECT kingdom_id FROM kingdom_members WHERE user_id = ? AND status = 'active' LIMIT 1",
				)
				.bind(user.id)
				.first<{ kingdom_id: number }>();

			// Skip if they already have a pending request.
			const dup = await db
				.prepare(
					"SELECT id FROM password_reset_requests WHERE user_id = ? AND status = 'pending'",
				)
				.bind(user.id)
				.first();

			if (!dup) {
				await db
					.prepare(
						`INSERT INTO password_reset_requests (user_id, kingdom_id, note, status)
						 VALUES (?, ?, ?, 'pending')`,
					)
					.bind(user.id, membership?.kingdom_id ?? null, note)
					.run();
			}
		}

		return { sent: true };
	},
};
