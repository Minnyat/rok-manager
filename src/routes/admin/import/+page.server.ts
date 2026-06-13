import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { parseCSV, insertPlayerData } from '$lib/server/csv';

export const load: PageServerLoad = async ({ platform }) => {
	const db = getDb(platform);
	const versions = await db
		.prepare('SELECT * FROM data_versions ORDER BY imported_at DESC')
		.all();
	return { versions: versions.results };
};

export const actions: Actions = {
	upload: async ({ request, locals, platform }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });

		const form = await request.formData();
		const file = form.get('file') as File;
		const versionName = String(form.get('name') || '').trim();

		if (!file || !file.size) return fail(400, { error: 'Vui lòng chọn file CSV' });
		if (!versionName) return fail(400, { error: 'Vui lòng nhập tên phiên bản' });

		const csvText = await file.text();
		const { rows, errors, warnings } = parseCSV(csvText);

		if (errors.length > 0) {
			return fail(400, { error: `Lỗi parse CSV: ${errors.slice(0, 3).join('; ')}` });
		}
		if (rows.length === 0) {
			return fail(400, { error: 'Không có dữ liệu hợp lệ trong file' });
		}

		const db = getDb(platform);

		const version = await db
			.prepare(
				'INSERT INTO data_versions (name, filename, row_count, imported_by) VALUES (?, ?, ?, ?)'
			)
			.bind(versionName, file.name, rows.length, locals.user.id)
			.run();

		const versionId = version.meta.last_row_id as number;
		await insertPlayerData(db, versionId, rows);

		return { success: true, rowCount: rows.length, versionName, warnings };
	}
};
