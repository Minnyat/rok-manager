import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { calculateScores } from '$lib/server/scores';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) throw redirect(303, '/login');

	const db = getDb(platform);

	const activeVersion = await db
		.prepare('SELECT id FROM data_versions WHERE is_active = 1 LIMIT 1')
		.first<{ id: number }>();

	const links = await db
		.prepare('SELECT al.id, al.governor_id FROM account_links al WHERE al.user_id = ?')
		.bind(locals.user.id)
		.all<{ id: number; governor_id: number }>();

	const subAccounts = [];
	if (activeVersion) {
		for (const link of links.results) {
			const player = await db
				.prepare('SELECT governor_id, governor_name, power, ranking FROM player_data WHERE version_id = ? AND governor_id = ? LIMIT 1')
				.bind(activeVersion.id, link.governor_id)
				.first();
			subAccounts.push({
				linkId: link.id,
				governorId: link.governor_id,
				...(player || { governor_name: `ID: ${link.governor_id}`, power: 0, ranking: 0 })
			});
		}
	}

	return { subAccounts };
};

export const actions: Actions = {
	add: async ({ request, locals, platform }) => {
		if (!locals.user) throw redirect(303, '/login');

		const form = await request.formData();
		const query = String(form.get('query') || '').trim();
		if (!query) return fail(400, { error: 'Vui lòng nhập ID hoặc tên governor' });

		const db = getDb(platform);

		const activeVersion = await db
			.prepare('SELECT id FROM data_versions WHERE is_active = 1 LIMIT 1')
			.first<{ id: number }>();
		if (!activeVersion) return fail(400, { error: 'Chưa có dữ liệu. Liên hệ Admin.' });

		let player;
		const numQuery = Number(query);
		if (!isNaN(numQuery) && numQuery > 0) {
			player = await db
				.prepare('SELECT governor_id, governor_name FROM player_data WHERE version_id = ? AND governor_id = ? LIMIT 1')
				.bind(activeVersion.id, numQuery)
				.first<{ governor_id: number; governor_name: string }>();
		}
		if (!player) {
			player = await db
				.prepare('SELECT governor_id, governor_name FROM player_data WHERE version_id = ? AND governor_name LIKE ? LIMIT 1')
				.bind(activeVersion.id, `%${query}%`)
				.first<{ governor_id: number; governor_name: string }>();
		}

		if (!player) return fail(404, { error: `Không tìm thấy governor "${query}"`, query });

		if (player.governor_id === locals.user.mainGovernorId) {
			return fail(400, { error: 'Đây là tài khoản chính của bạn', query });
		}

		const existingLink = await db
			.prepare('SELECT user_id FROM account_links WHERE governor_id = ?')
			.bind(player.governor_id)
			.first<{ user_id: number }>();

		if (existingLink) {
			if (existingLink.user_id === locals.user.id) {
				return fail(400, { error: 'Bạn đã liên kết tài khoản này rồi', query });
			}
			return fail(409, {
				error: `Tài khoản "${player.governor_name}" đã được người khác liên kết`,
				canReport: true,
				disputedGovernorId: player.governor_id,
				disputedGovernorName: player.governor_name,
				query
			});
		}

		const mainOwner = await db
			.prepare('SELECT id FROM users WHERE main_governor_id = ? AND id != ?')
			.bind(player.governor_id, locals.user.id)
			.first();
		if (mainOwner) {
			return fail(409, {
				error: `Tài khoản "${player.governor_name}" là tài khoản chính của người khác`,
				canReport: true,
				disputedGovernorId: player.governor_id,
				disputedGovernorName: player.governor_name,
				query
			});
		}

		await db
			.prepare('INSERT INTO account_links (user_id, governor_id) VALUES (?, ?)')
			.bind(locals.user.id, player.governor_id)
			.run();

		await calculateScores(db, activeVersion.id);

		return { success: true, addedName: player.governor_name };
	},

	remove: async ({ request, locals, platform }) => {
		if (!locals.user) throw redirect(303, '/login');

		const form = await request.formData();
		const linkId = Number(form.get('linkId'));
		if (!linkId) return fail(400, { error: 'Invalid link ID' });

		const db = getDb(platform);
		await db
			.prepare('DELETE FROM account_links WHERE id = ? AND user_id = ?')
			.bind(linkId, locals.user.id)
			.run();

		const activeVersion = await db
			.prepare('SELECT id FROM data_versions WHERE is_active = 1 LIMIT 1')
			.first<{ id: number }>();
		if (activeVersion) await calculateScores(db, activeVersion.id);

		return { removed: true };
	},

	report: async ({ request, locals, platform }) => {
		if (!locals.user) throw redirect(303, '/login');

		const form = await request.formData();
		const governorId = Number(form.get('governorId'));
		const message = String(form.get('message') || '').trim();

		if (!governorId) return fail(400, { error: 'Invalid governor ID' });

		const db = getDb(platform);
		await db
			.prepare('INSERT INTO account_reports (reporter_user_id, disputed_governor_id, message) VALUES (?, ?, ?)')
			.bind(locals.user.id, governorId, message || null)
			.run();

		return { reported: true };
	}
};
