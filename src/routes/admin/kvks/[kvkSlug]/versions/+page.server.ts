import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getDb } from "$lib/server/db";
import { setActiveVersionForKvk } from "$lib/server/kvk";
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
	activate: async ({ request, platform, params, locals }) => {
		const db = getDb(platform);
		const kvk = await db
			.prepare("SELECT id, slug, kingdom_id FROM kvks WHERE slug = ?")
			.bind(params.kvkSlug)
			.first<{ id: number; slug: string; kingdom_id: number | null }>();
		if (!kvk) return fail(404, { error: t(locals.lang, "err.kvkNotFound") });
		const allowed = kvk.kingdom_id == null ? isAdmin(locals.user) : isKingdomManager(locals.user, kvk.kingdom_id);
		if (!allowed) return fail(403, { error: t(locals.lang, "err.forbidden") });

		const form = await request.formData();
		const versionId = Number(form.get("versionId"));

		if (!versionId) return fail(400, { error: "Invalid version ID" });

		// Activate in this KvK
		await setActiveVersionForKvk(db, kvk.id, versionId);

		// Sync global is_active for legacy KvK backward compatibility
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

		return { activated: true };
	},
};
