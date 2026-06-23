import { fail, redirect, error } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { hashPassword, createSession } from "$lib/server/auth";
import { getDb } from "$lib/server/db";
import { getDefaultKvk, getActiveVersionForKvk } from "$lib/server/kvk";
import { t } from "$lib/i18n";

export const load: PageServerLoad = async ({ params, platform, locals }) => {
	const db = getDb(platform);
	const now = Math.floor(Date.now() / 1000);

	const user = await db
		.prepare(
			`SELECT u.id, u.main_governor_id, u.is_active, u.invite_expires_at,
			        u.invite_kingdom_id, u.invite_kingdom_role
			 FROM users u WHERE u.invite_token = ?`,
		)
		.bind(params.token)
		.first<{
			id: number;
			main_governor_id: number;
			is_active: number;
			invite_expires_at: number;
			invite_kingdom_id: number | null;
			invite_kingdom_role: string | null;
		}>();

	if (!user) throw error(404, t(locals.lang, "err.inviteInvalid"));
	if (user.is_active) throw redirect(303, "/login");
	if (user.invite_expires_at < now) throw error(410, t(locals.lang, "err.inviteExpired"));

	// King / kingdom-management invites aren't tied to a governor — they're a
	// standalone management account. Show the kingdom instead of a governor.
	if (user.main_governor_id <= 0) {
		let label = t(locals.lang, "inv.manageKingdom");
		if (user.invite_kingdom_id) {
			const kd = await db
				.prepare("SELECT number, display_name FROM kingdoms WHERE id = ?")
				.bind(user.invite_kingdom_id)
				.first<{ number: string; display_name: string | null }>();
			if (kd) {
				label = kd.display_name
					? `👑 ${kd.display_name} (KD ${kd.number})`
					: `👑 Kingdom ${kd.number}`;
			}
		}
		return { governorName: label, governorId: 0, isKing: true };
	}

	const kvk = await getDefaultKvk(db);
	const activeVersion = kvk ? await getActiveVersionForKvk(db, kvk.id) : null;

	let governorName = `Governor #${user.main_governor_id}`;
	if (activeVersion) {
		const player = await db
			.prepare(
				"SELECT governor_name FROM player_data WHERE version_id = ? AND governor_id = ? LIMIT 1",
			)
			.bind(activeVersion.id, user.main_governor_id)
			.first<{ governor_name: string }>();
		if (player) governorName = player.governor_name;
	}

	return { governorName, governorId: user.main_governor_id, isKing: false };
};

export const actions: Actions = {
	default: async ({ request, params, platform, cookies, locals }) => {
		const form = await request.formData();
		const username = String(form.get("username") || "")
			.trim()
			.toLowerCase();
		const password = String(form.get("password") || "");
		const confirmPassword = String(form.get("confirmPassword") || "");

		if (!username || username.length < 3) {
			return fail(400, {
				error: t(locals.lang, "err.usernameMin3"),
				username,
			});
		}
		if (!password || password.length < 6) {
			return fail(400, { error: t(locals.lang, "err.passwordMin6"), username });
		}
		if (password !== confirmPassword) {
			return fail(400, { error: t(locals.lang, "err.passwordMismatch"), username });
		}

		const db = getDb(platform);
		const now = Math.floor(Date.now() / 1000);

		const user = await db
			.prepare(
				`SELECT id, invite_expires_at, is_active, main_governor_id,
				        invite_kingdom_id, invite_kingdom_role
				 FROM users WHERE invite_token = ?`,
			)
			.bind(params.token)
			.first<{
				id: number;
				invite_expires_at: number;
				is_active: number;
				main_governor_id: number;
				invite_kingdom_id: number | null;
				invite_kingdom_role: string | null;
			}>();

		if (!user || user.is_active || user.invite_expires_at < now) {
			return fail(400, { error: t(locals.lang, "err.inviteInvalidOrExpired") });
		}

		const existing = await db
			.prepare("SELECT id FROM users WHERE LOWER(username) = ?")
			.bind(username)
			.first();
		if (existing) {
			return fail(400, { error: t(locals.lang, "err.usernameExists"), username });
		}

		const passwordHash = await hashPassword(password);
		await db
			.prepare(
				`UPDATE users SET username = ?, password_hash = ?, is_active = 1,
				 invite_token = NULL, invite_expires_at = NULL,
				 invite_kingdom_id = NULL, invite_kingdom_role = NULL, updated_at = ?
				 WHERE id = ?`,
			)
			.bind(username, passwordHash, now, user.id)
			.run();

		// Create the kingdom membership for this account. Legacy invites (no
		// target kingdom) default to the '0000' kingdom as a member.
		let kingdomId = user.invite_kingdom_id;
		const kingdomRole =
			(user.invite_kingdom_role as "king" | "r4" | "member" | null) ?? "member";
		if (!kingdomId) {
			const def = await db
				.prepare("SELECT id FROM kingdoms WHERE number = '0000'")
				.first<{ id: number }>();
			kingdomId = def?.id ?? null;
		}
		if (kingdomId) {
			await db
				.prepare(
					`INSERT OR IGNORE INTO kingdom_members (kingdom_id, user_id, governor_id, role, status, joined_at)
					 VALUES (?, ?, ?, ?, 'active', ?)`,
				)
				.bind(kingdomId, user.id, user.main_governor_id, kingdomRole, now)
				.run();

			if (kingdomRole === "king") {
				await db
					.prepare(
						"UPDATE kingdoms SET king_user_id = ?, updated_at = ? WHERE id = ?",
					)
					.bind(user.id, now, kingdomId)
					.run();
			}
		}

		const sessionId = await createSession(db, user.id);
		cookies.set("session", sessionId, {
			path: "/",
			httpOnly: true,
			secure: true,
			sameSite: "lax",
			maxAge: 30 * 24 * 60 * 60,
		});

		throw redirect(303, "/dashboard");
	},
};
