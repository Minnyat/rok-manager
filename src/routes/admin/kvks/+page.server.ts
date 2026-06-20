import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getDb } from "$lib/server/db";
import { getKvks, createKvk, getKvkStats } from "$lib/server/kvk";
import { seedScoringConfigForKvk } from "$lib/server/scoring-config";

export const load: PageServerLoad = async ({ platform }) => {
	const db = getDb(platform);
	const kvks = await getKvks(db);

	// Load stats for each KvK
	const kvkStats = await Promise.all(kvks.map((k) => getKvkStats(db, k.id)));

	return { kvks, kvkStats };
};

export const actions: Actions = {
	create: async ({ request, platform, locals }) => {
		if (!locals.user) return fail(401, { error: "Unauthorized" });

		const form = await request.formData();
		const name = String(form.get("name") || "").trim();
		const description = String(form.get("description") || "").trim() || null;

		if (!name) return fail(400, { error: "Tên KvK không được để trống" });

		// Generate slug from name
		const slug = name
			.toLowerCase()
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "");

		const db = getDb(platform);

		// Check name uniqueness
		const existingName = await db
			.prepare("SELECT id FROM kvks WHERE name = ?")
			.bind(name)
			.first();
		if (existingName) {
			return fail(400, {
				error: `Tên KvK "${name}" đã tồn tại. Chọn tên khác.`,
			});
		}

		// Check slug uniqueness
		const existing = await db
			.prepare("SELECT id FROM kvks WHERE slug = ?")
			.bind(slug)
			.first();
		if (existing) {
			return fail(400, { error: `Slug "${slug}" đã tồn tại. Chọn tên khác.` });
		}

		const kvkId = await createKvk(
			db,
			name,
			slug || `kvk-${Date.now()}`,
			description,
			locals.user.id,
		);

		// Seed scoring config from global defaults
		await seedScoringConfigForKvk(db, kvkId);

		return { created: true, kvkId, slug: slug || `kvk-${Date.now()}` };
	},
};
