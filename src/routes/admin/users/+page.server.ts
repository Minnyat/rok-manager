import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getDb } from "$lib/server/db";
import { createInviteToken } from "$lib/server/auth";
import { issueTempPassword } from "$lib/server/password";
import { t } from "$lib/i18n";

export const load: PageServerLoad = async ({ locals, platform, url }) => {
	if (locals.user?.role !== "admin") throw redirect(303, "/admin");

	const db = getDb(platform);
	const search = url.searchParams.get("q")?.trim() || "";

	let query = `SELECT u.id, u.username, u.role, u.main_governor_id, u.is_active, u.invite_token,
		        u.created_at, u.updated_at
		 FROM users u`;
	const params: any[] = [];

	if (search) {
		query += ` WHERE u.username LIKE ? OR CAST(u.main_governor_id AS TEXT) LIKE ?`;
		params.push(`%${search}%`, `%${search}%`);
	}

	query += ` ORDER BY u.created_at DESC`;

	const users = params.length
		? await db
				.prepare(query)
				.bind(...params)
				.all()
		: await db.prepare(query).all();

	// All pending forgot-password requests across every kingdom (admin handles
	// any kingdom, plus requests from users with no active kingdom).
	const resetRequests = await db
		.prepare(
			`SELECT prr.id, prr.note, prr.created_at, u.username,
			        u.main_governor_id AS governor_id, k.number AS kingdom_number
			 FROM password_reset_requests prr
			 JOIN users u ON u.id = prr.user_id
			 LEFT JOIN kingdoms k ON k.id = prr.kingdom_id
			 WHERE prr.status = 'pending'
			 ORDER BY prr.created_at DESC`,
		)
		.all();

	return {
		users: users.results,
		resetRequests: resetRequests.results,
		baseUrl: url.origin,
		search,
	};
};

export const actions: Actions = {
	create: async ({ request, locals, platform, url }) => {
		const form = await request.formData();
		const governorId = Number(form.get("governorId"));
		const role = String(form.get("role") || "player");

		if (!governorId || governorId <= 0) {
			return fail(400, { error: t(locals.lang, "err.invalidGovernorId") });
		}
		if (!["player", "king"].includes(role)) {
			return fail(400, { error: t(locals.lang, "err.invalidRole") });
		}

		const db = getDb(platform);

		const existing = await db
			.prepare("SELECT id FROM users WHERE main_governor_id = ?")
			.bind(governorId)
			.first();
		if (existing) {
			return fail(400, {
				error: t(locals.lang, "err.governorHasAccount", { id: governorId }),
			});
		}

		const token = await createInviteToken(
			db,
			governorId,
			role as "player" | "king",
		);
		const inviteUrl = `${url.origin}/invite/${token}`;

		return { success: true, inviteUrl };
	},

	updateRole: async ({ request, locals, platform }) => {
		const form = await request.formData();
		const userId = Number(form.get("userId"));
		const newRole = String(form.get("role"));

		if (!userId || !["player", "king", "admin"].includes(newRole)) {
			return fail(400, { error: t(locals.lang, "err.invalidData") });
		}

		const db = getDb(platform);
		await db
			.prepare("UPDATE users SET role = ?, updated_at = ? WHERE id = ?")
			.bind(newRole, Math.floor(Date.now() / 1000), userId)
			.run();

		return { roleUpdated: true };
	},

	deactivate: async ({ request, platform }) => {
		const form = await request.formData();
		const userId = Number(form.get("userId"));
		if (!userId) return fail(400, { error: "Invalid user ID" });

		const db = getDb(platform);
		await db
			.prepare("UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?")
			.bind(Math.floor(Date.now() / 1000), userId)
			.run();
		await db
			.prepare("DELETE FROM sessions WHERE user_id = ?")
			.bind(userId)
			.run();

		return { deactivated: true };
	},

	resetInvite: async ({ request, locals, platform, url }) => {
		const form = await request.formData();
		const userId = Number(form.get("userId"));
		if (!userId) return fail(400, { error: "Invalid user ID" });

		const db = getDb(platform);
		const user = await db
			.prepare("SELECT main_governor_id, is_active FROM users WHERE id = ?")
			.bind(userId)
			.first<{ main_governor_id: number; is_active: number }>();

		if (!user || user.is_active) {
			return fail(400, { error: t(locals.lang, "err.userActivatedNoResetInvite") });
		}

		const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(
			/-/g,
			"",
		);
		const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

		await db
			.prepare(
				"UPDATE users SET invite_token = ?, invite_expires_at = ? WHERE id = ?",
			)
			.bind(token, expiresAt, userId)
			.run();

		return { success: true, inviteUrl: `${url.origin}/invite/${token}` };
	},

	// Admin: issue a one-time password for any active user.
	resetPassword: async ({ request, locals, platform }) => {
		if (locals.user?.role !== "admin") return fail(403, { error: "Forbidden" });

		const form = await request.formData();
		const userId = Number(form.get("userId"));
		if (!userId) return fail(400, { error: "Invalid user ID" });
		if (userId === locals.user.id) {
			return fail(400, { error: t(locals.lang, "err.useSettingsForOwnPassword") });
		}

		const db = getDb(platform);
		const target = await db
			.prepare("SELECT username, is_active FROM users WHERE id = ?")
			.bind(userId)
			.first<{ username: string | null; is_active: number }>();
		if (!target || !target.is_active) {
			return fail(400, { error: t(locals.lang, "err.userNotActivatedNoReset") });
		}

		const tempPassword = await issueTempPassword(db, userId);
		return { resetUsername: target.username, tempPassword };
	},

	resolveResetRequest: async ({ request, locals, platform }) => {
		if (locals.user?.role !== "admin") return fail(403, { error: "Forbidden" });

		const form = await request.formData();
		const requestId = Number(form.get("requestId"));
		if (!requestId) return fail(400, { error: t(locals.lang, "err.missingRequest") });

		const db = getDb(platform);
		const req = await db
			.prepare(
				`SELECT prr.id, prr.user_id, u.username
				 FROM password_reset_requests prr JOIN users u ON u.id = prr.user_id
				 WHERE prr.id = ? AND prr.status = 'pending'`,
			)
			.bind(requestId)
			.first<{ id: number; user_id: number; username: string | null }>();
		if (!req) return fail(404, { error: t(locals.lang, "err.requestNotFound") });

		const tempPassword = await issueTempPassword(db, req.user_id);
		await db
			.prepare(
				"UPDATE password_reset_requests SET status = 'resolved', resolved_by = ?, resolved_at = unixepoch() WHERE id = ?",
			)
			.bind(locals.user.id, requestId)
			.run();

		return { resetUsername: req.username, tempPassword };
	},

	rejectResetRequest: async ({ request, locals, platform }) => {
		if (locals.user?.role !== "admin") return fail(403, { error: "Forbidden" });

		const form = await request.formData();
		const requestId = Number(form.get("requestId"));
		if (!requestId) return fail(400, { error: t(locals.lang, "err.missingRequest") });

		const db = getDb(platform);
		await db
			.prepare(
				"UPDATE password_reset_requests SET status = 'rejected', resolved_by = ?, resolved_at = unixepoch() WHERE id = ? AND status = 'pending'",
			)
			.bind(locals.user.id, requestId)
			.run();

		return { rejectedRequest: true };
	},
};
