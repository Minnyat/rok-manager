import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getDb } from "$lib/server/db";
import { parseCSV, insertPlayerData } from "$lib/server/csv";
import { setActiveVersionForKvk } from "$lib/server/kvk";
import { getKingdomStorage } from "$lib/server/kingdom";
import { calculateScores } from "$lib/server/scores";
import { isAdmin, isKingdomManager } from "$lib/server/permissions";
import { t } from "$lib/i18n";

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
			.prepare("SELECT id, slug, kingdom_id FROM kvks WHERE slug = ?")
			.bind(params.kvkSlug)
			.first<{ id: number; slug: string; kingdom_id: number | null }>();
		if (!kvk) return fail(404, { error: t(locals.lang, "err.kvkNotFound") });
		const allowed = kvk.kingdom_id == null ? isAdmin(locals.user) : isKingdomManager(locals.user, kvk.kingdom_id);
		if (!allowed) return fail(403, { error: t(locals.lang, "err.forbidden") });

		const form = await request.formData();
		const file = form.get("file") as File;
		const versionName = String(form.get("name") || "").trim();
		const activateAfterImport = form.get("activate") === "on";
		const calculateAfterImport = form.get("calculate") === "on";

		if (!file || !file.size)
			return fail(400, { error: t(locals.lang, "err.selectCsv") });
		if (!versionName)
			return fail(400, { error: t(locals.lang, "err.enterVersionName") });

		const csvText = await file.text();
		const { rows, errors, warnings } = parseCSV(csvText);

		if (errors.length > 0) {
			return fail(400, {
				error: t(locals.lang, "err.csvParse", { detail: errors.slice(0, 3).join("; ") }),
			});
		}
		if (rows.length === 0) {
			return fail(400, { error: t(locals.lang, "err.noValidData") });
		}

		// Storage quota enforcement (per kingdom, measured in MB of CSV bytes).
		const sizeBytes = new TextEncoder().encode(csvText).length;
		if (kvk.kingdom_id) {
			const storage = await getKingdomStorage(db, kvk.kingdom_id);
			if (storage.usedBytes + sizeBytes > storage.quotaBytes) {
				const usedMb = (storage.usedBytes / (1024 * 1024)).toFixed(1);
				const fileMb = (sizeBytes / (1024 * 1024)).toFixed(2);
				return fail(400, {
					error: t(locals.lang, "err.storageLimit", {
						quota: storage.quotaMb,
						used: usedMb,
						file: fileMb,
					}),
				});
			}
		}

		const version = await db
			.prepare(
				"INSERT INTO data_versions (name, filename, row_count, size_bytes, imported_by, kvk_id) VALUES (?, ?, ?, ?, ?, ?)",
			)
			.bind(versionName, file.name, rows.length, sizeBytes, locals.user.id, kvk.id)
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
