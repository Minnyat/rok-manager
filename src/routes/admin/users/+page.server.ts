import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { createInviteToken } from '$lib/server/auth';
import { calculateScores } from '$lib/server/scores';

export const load: PageServerLoad = async ({ platform, url }) => {
	const db = getDb(platform);
	const search = url.searchParams.get('q')?.trim() || '';

	let query = `SELECT u.id, u.username, u.role, u.main_governor_id, u.is_active, u.invite_token,
		        u.created_at, u.updated_at, u.dkp_bonus_pct
		 FROM users u`;
	const params: any[] = [];

	if (search) {
		query += ` WHERE u.username LIKE ? OR CAST(u.main_governor_id AS TEXT) LIKE ?`;
		params.push(`%${search}%`, `%${search}%`);
	}

	query += ` ORDER BY u.created_at DESC`;

	const users = params.length
		? await db.prepare(query).bind(...params).all()
		: await db.prepare(query).all();

	return { users: users.results, baseUrl: url.origin, search };
};

export const actions: Actions = {
	create: async ({ request, platform, url }) => {
		const form = await request.formData();
		const governorId = Number(form.get('governorId'));
		const role = String(form.get('role') || 'player');

		if (!governorId || governorId <= 0) {
			return fail(400, { error: 'Governor ID không hợp lệ' });
		}
		if (!['player', 'king'].includes(role)) {
			return fail(400, { error: 'Role không hợp lệ' });
		}

		const db = getDb(platform);

		const existing = await db
			.prepare('SELECT id FROM users WHERE main_governor_id = ?')
			.bind(governorId)
			.first();
		if (existing) {
			return fail(400, { error: `Governor ID ${governorId} đã được tạo tài khoản` });
		}

		const token = await createInviteToken(db, governorId, role as 'player' | 'king');
		const inviteUrl = `${url.origin}/invite/${token}`;

		return { success: true, inviteUrl };
	},

	updateRole: async ({ request, platform }) => {
		const form = await request.formData();
		const userId = Number(form.get('userId'));
		const newRole = String(form.get('role'));

		if (!userId || !['player', 'king', 'admin'].includes(newRole)) {
			return fail(400, { error: 'Dữ liệu không hợp lệ' });
		}

		const db = getDb(platform);
		await db
			.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?')
			.bind(newRole, Math.floor(Date.now() / 1000), userId)
			.run();

		return { roleUpdated: true };
	},

	deactivate: async ({ request, platform }) => {
		const form = await request.formData();
		const userId = Number(form.get('userId'));
		if (!userId) return fail(400, { error: 'Invalid user ID' });

		const db = getDb(platform);
		await db
			.prepare('UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?')
			.bind(Math.floor(Date.now() / 1000), userId)
			.run();
		await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();

		return { deactivated: true };
	},

	setBonus: async ({ request, platform }) => {
		const form = await request.formData();
		const userId = Number(form.get('userId'));
		const bonus = parseFloat(String(form.get('bonus') || '0'));

		if (!userId) return fail(400, { error: 'Invalid user ID' });
		if (isNaN(bonus) || bonus < 0 || bonus > 100) {
			return fail(400, { error: 'Bonus phải từ 0-100%' });
		}

		const db = getDb(platform);
		await db
			.prepare('UPDATE users SET dkp_bonus_pct = ?, updated_at = ? WHERE id = ?')
			.bind(bonus, Math.floor(Date.now() / 1000), userId)
			.run();

		const activeVersion = await db
			.prepare('SELECT id FROM data_versions WHERE is_active = 1 LIMIT 1')
			.first<{ id: number }>();
		if (activeVersion) await calculateScores(db, activeVersion.id);

		return { bonusUpdated: true };
	},

	resetInvite: async ({ request, platform, url }) => {
		const form = await request.formData();
		const userId = Number(form.get('userId'));
		if (!userId) return fail(400, { error: 'Invalid user ID' });

		const db = getDb(platform);
		const user = await db
			.prepare('SELECT main_governor_id, is_active FROM users WHERE id = ?')
			.bind(userId)
			.first<{ main_governor_id: number; is_active: number }>();

		if (!user || user.is_active) {
			return fail(400, { error: 'User đã kích hoạt, không thể reset invite' });
		}

		const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '');
		const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

		await db
			.prepare('UPDATE users SET invite_token = ?, invite_expires_at = ? WHERE id = ?')
			.bind(token, expiresAt, userId)
			.run();

		return { success: true, inviteUrl: `${url.origin}/invite/${token}` };
	}
};
