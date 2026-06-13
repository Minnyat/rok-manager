import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { verifyPassword, createSession } from '$lib/server/auth';
import { getDb } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(303, '/dashboard');
};

export const actions: Actions = {
	default: async ({ request, platform, cookies }) => {
		const form = await request.formData();
		const username = String(form.get('username') || '').trim().toLowerCase();
		const password = String(form.get('password') || '');

		if (!username || !password) {
			return fail(400, { error: 'Vui lòng nhập đầy đủ thông tin', username });
		}

		const db = getDb(platform);
		const user = await db
			.prepare('SELECT id, password_hash, is_active FROM users WHERE LOWER(username) = ?')
			.bind(username)
			.first<{ id: number; password_hash: string; is_active: number }>();

		if (!user || !user.is_active || !user.password_hash) {
			return fail(400, { error: 'Sai tài khoản hoặc mật khẩu', username });
		}

		const valid = await verifyPassword(password, user.password_hash);
		if (!valid) {
			return fail(400, { error: 'Sai tài khoản hoặc mật khẩu', username });
		}

		const sessionId = await createSession(db, user.id);
		cookies.set('session', sessionId, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 30 * 24 * 60 * 60
		});

		throw redirect(303, '/dashboard');
	}
};
