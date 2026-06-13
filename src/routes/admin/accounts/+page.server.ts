import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { calculateScores } from '$lib/server/scores';

export const load: PageServerLoad = async ({ platform }) => {
	const db = getDb(platform);

	const links = await db
		.prepare(
			`SELECT al.id, al.governor_id, al.linked_at, u.username, u.main_governor_id
			 FROM account_links al
			 JOIN users u ON al.user_id = u.id
			 ORDER BY al.linked_at DESC`
		)
		.all();

	const reports = await db
		.prepare(
			`SELECT ar.*, u.username as reporter_name
			 FROM account_reports ar
			 JOIN users u ON ar.reporter_user_id = u.id
			 ORDER BY ar.created_at DESC`
		)
		.all();

	return { links: links.results, reports: reports.results };
};

export const actions: Actions = {
	resolve: async ({ request, platform }) => {
		const form = await request.formData();
		const reportId = Number(form.get('reportId'));
		const action = String(form.get('action'));

		if (!reportId || !['resolved', 'rejected'].includes(action)) {
			return fail(400, { error: 'Invalid' });
		}

		const db = getDb(platform);
		await db
			.prepare('UPDATE account_reports SET status = ?, resolved_at = ? WHERE id = ?')
			.bind(action, Math.floor(Date.now() / 1000), reportId)
			.run();

		return { updated: true };
	},

	unlink: async ({ request, platform }) => {
		const form = await request.formData();
		const linkId = Number(form.get('linkId'));
		if (!linkId) return fail(400, { error: 'Invalid link ID' });

		const db = getDb(platform);
		await db.prepare('DELETE FROM account_links WHERE id = ?').bind(linkId).run();

		const activeVersion = await db
			.prepare('SELECT id FROM data_versions WHERE is_active = 1 LIMIT 1')
			.first<{ id: number }>();
		if (activeVersion) await calculateScores(db, activeVersion.id);

		return { unlinked: true };
	}
};
