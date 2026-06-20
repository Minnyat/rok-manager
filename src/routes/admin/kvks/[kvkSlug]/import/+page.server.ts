import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getDb } from "$lib/server/db";
import { parseCSV, insertPlayerData } from "$lib/server/csv";
import { setActiveVersionForKvk } from "$lib/server/kvk";
import { calculateScores } from "$lib/server/scores";

export const load: PageServerLoad = async ({ platform, parent }) => {
	const db = getDb(platform);
	const { kvk } = await parent();

	const versions = await db
		.prepare(
			"SELECT * FROM data_versions WHERE kvk_id = ? ORDER BY imported_at DESC",
		)
		.bind(kvk.id)
		.all();

	return { versions: versions.results, kvk };
};

export const actions: Actions = {
	upload: async ({ request, locals, platform, params }) => {
		if (!locals.user) return fail(401, { error: "Unauthorized" });

		const db = getDb(platform);
		const kvk = await db
			.prepare("SELECT id, slug FROM kvks WHERE slug = ?")
			.bind(params.kvkSlug)
			.first<{ id: number; slug: string }>();
		if (!kvk) return fail(404, { error: "Không tìm thấy KvK" });

		const form = await request.formData();
		const file = form.get("file") as File;
		const versionName = String(form.get("name") || "").trim();
		const activateAfterImport = form.get("activate") === "on";
		const calculateAfterImport = form.get("calculate") === "on";

		if (!file || !file.size)
			return fail(400, { error: "Vui lòng chọn file CSV" });
		if (!versionName)
			return fail(400, { error: "Vui lòng nhập tên phiên bản" });

		const csvText = await file.text();
		const { rows, errors, warnings } = parseCSV(csvText);

		if (errors.length > 0) {
			return fail(400, {
				error: `Lỗi parse CSV: ${errors.slice(0, 3).join("; ")}`,
			});
		}
		if (rows.length === 0) {
			return fail(400, { error: "Không có dữ liệu hợp lệ trong file" });
		}

		const version = await db
			.prepare(
				"INSERT INTO data_versions (name, filename, row_count, imported_by, kvk_id) VALUES (?, ?, ?, ?, ?)",
			)
			.bind(versionName, file.name, rows.length, locals.user.id, kvk.id)
			.run();

		const versionId = version.meta.last_row_id as number;
		await insertPlayerData(db, versionId, rows);

		// Activate if requested
		if (activateAfterImport) {
			await setActiveVersionForKvk(db, kvk.id, versionId);

			// Sync global is_active for legacy KvK
			if (kvk.slug === "legacy-current") {
				await db.batch([
					db.prepare(
						"UPDATE data_versions SET is_active = 0 WHERE is_active = 1",
					),
					db
						.prepare("UPDATE data_versions SET is_active = 1 WHERE id = ?")
						.bind(versionId),
				]);
			}
		}

		// Calculate scores if requested
		let scoreCount = 0;
		if (calculateAfterImport) {
			scoreCount = await calculateScores(db, versionId);
		}

		return {
			success: true,
			rowCount: rows.length,
			versionName,
			warnings,
			scoreCount,
			activated: activateAfterImport,
		};
	},
};
