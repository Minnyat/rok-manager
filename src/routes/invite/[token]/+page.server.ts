import { fail, redirect, error } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { hashPassword, createSession } from "$lib/server/auth";
import { getDb } from "$lib/server/db";
import { getDefaultKvk, getActiveVersionForKvk } from "$lib/server/kvk";

export const load: PageServerLoad = async ({ params, platform }) => {
	const db = getDb(platform);
	const now = Math.floor(Date.now() / 1000);

	const user = await db
		.prepare(
			`SELECT u.id, u.main_governor_id, u.is_active, u.invite_expires_at
			 FROM users u WHERE u.invite_token = ?`,
		)
		.bind(params.token)
		.first<{
			id: number;
			main_governor_id: number;
			is_active: number;
			invite_expires_at: number;
		}>();

	if (!user) throw error(404, "Link mời không hợp lệ");
	if (user.is_active) throw redirect(303, "/login");
	if (user.invite_expires_at < now) throw error(410, "Link mời đã hết hạn");

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

	return { governorName, governorId: user.main_governor_id };
};

export const actions: Actions = {
	default: async ({ request, params, platform, cookies }) => {
		const form = await request.formData();
		const username = String(form.get("username") || "")
			.trim()
			.toLowerCase();
		const password = String(form.get("password") || "");
		const confirmPassword = String(form.get("confirmPassword") || "");

		if (!username || username.length < 3) {
			return fail(400, {
				error: "Tên đăng nhập phải có ít nhất 3 ký tự",
				username,
			});
		}
		if (!password || password.length < 6) {
			return fail(400, { error: "Mật khẩu phải có ít nhất 6 ký tự", username });
		}
		if (password !== confirmPassword) {
			return fail(400, { error: "Mật khẩu xác nhận không khớp", username });
		}

		const db = getDb(platform);
		const now = Math.floor(Date.now() / 1000);

		const user = await db
			.prepare(
				"SELECT id, invite_expires_at, is_active FROM users WHERE invite_token = ?",
			)
			.bind(params.token)
			.first<{ id: number; invite_expires_at: number; is_active: number }>();

		if (!user || user.is_active || user.invite_expires_at < now) {
			return fail(400, { error: "Link mời không hợp lệ hoặc đã hết hạn" });
		}

		const existing = await db
			.prepare("SELECT id FROM users WHERE LOWER(username) = ?")
			.bind(username)
			.first();
		if (existing) {
			return fail(400, { error: "Tên đăng nhập đã tồn tại", username });
		}

		const passwordHash = await hashPassword(password);
		await db
			.prepare(
				`UPDATE users SET username = ?, password_hash = ?, is_active = 1,
				 invite_token = NULL, invite_expires_at = NULL, updated_at = ?
				 WHERE id = ?`,
			)
			.bind(username, passwordHash, now, user.id)
			.run();

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
