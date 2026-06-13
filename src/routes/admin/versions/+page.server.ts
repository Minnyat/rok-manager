import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';

export const load: PageServerLoad = async ({ platform }) => {
	const db = getDb(platform);
	const versions = await db
		.prepare('SELECT * FROM data_versions ORDER BY imported_at DESC')
		.all();
	return { versions: versions.results };
};

export const actions: Actions = {
	activate: async ({ request, platform }) => {
		const form = await request.formData();
		const versionId = Number(form.get('versionId'));
		if (!versionId) return fail(400, { error: 'Invalid version ID' });

		const db = getDb(platform);
		await db.batch([
			db.prepare('UPDATE data_versions SET is_active = 0 WHERE is_active = 1'),
			db.prepare('UPDATE data_versions SET is_active = 1 WHERE id = ?').bind(versionId)
		]);

		return { activated: true };
	}
};
