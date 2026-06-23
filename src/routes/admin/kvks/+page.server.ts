import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getDb } from "$lib/server/db";
import { getKvks, createKvk, getKvkStats } from "$lib/server/kvk";
import { seedScoringConfigForKvk } from "$lib/server/scoring-config";
import { t } from "$lib/i18n";

export const load: PageServerLoad = async ({ platform, locals }) => {
	const db = getDb(platform);
	// System admin (kingdomId null) sees all; King/R4 see only their kingdom.
	const kingdomId = locals.user?.role === "admin" ? null : locals.user?.kingdomId ?? null;
	const kvks = await getKvks(db, kingdomId);

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

		if (!name) return fail(400, { error: t(locals.lang, "err.kvkNameEmpty") });

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
				error: t(locals.lang, "err.kvkNameExists", { name }),
			});
		}

		// Check slug uniqueness
		const existing = await db
			.prepare("SELECT id FROM kvks WHERE slug = ?")
			.bind(slug)
			.first();
		if (existing) {
			return fail(400, { error: t(locals.lang, "err.kvkSlugExists", { slug }) });
		}

		// Scope the new KvK to the creator's kingdom (null for system admin —
		// admins create KvKs from a kingdom detail page in the admin area).
		const kingdomId =
			locals.user.role === "admin" ? null : locals.user.kingdomId ?? null;
		const kvkId = await createKvk(
			db,
			name,
			slug || `kvk-${Date.now()}`,
			description,
			locals.user.id,
			kingdomId,
		);

		// Seed scoring config from global defaults
		await seedScoringConfigForKvk(db, kvkId);

		return { created: true, kvkId, slug: slug || `kvk-${Date.now()}` };
	},
};
