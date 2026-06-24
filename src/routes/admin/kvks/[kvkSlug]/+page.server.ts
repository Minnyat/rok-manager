import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getDb } from "$lib/server/db";
import { getKvkBySlug, updateKvk, slugify } from "$lib/server/kvk";
import { getKingdomById } from "$lib/server/kingdom";
import { getConversion, convertDkpToCoins } from "$lib/server/dkp";
import { isAdmin, isKingdomManager } from "$lib/server/permissions";
import { t } from "$lib/i18n";

export const load: PageServerLoad = async ({ platform, parent }) => {
	const db = getDb(platform);
	const { kvk, stats, activeVersion } = await parent();

	// Load versions for this KvK
	const versions = await db
		.prepare(
			"SELECT id, name, filename, row_count, imported_at FROM data_versions WHERE kvk_id = ? ORDER BY imported_at DESC",
		)
		.bind(kvk.id)
		.all();

	// Coin conversion status (set when the KvK is closed) + kingdom keep %.
	let conversion = null;
	let keepPct = 100;
	if (kvk.kingdom_id != null) {
		conversion = await getConversion(db, kvk.kingdom_id, kvk.id);
		const kingdom = await getKingdomById(db, kvk.kingdom_id);
		keepPct = kingdom?.coin_keep_pct ?? 100;
	}

	return {
		kvk,
		stats,
		activeVersion,
		versions: versions.results,
		conversion,
		keepPct,
	};
};

export const actions: Actions = {
	// Rename the KvK. Updates both the display name and the URL slug, then
	// redirects to the new slug (the old URL no longer resolves).
	rename: async ({ request, platform, params, locals }) => {
		const db = getDb(platform);
		const kvk = await getKvkBySlug(db, params.kvkSlug);
		if (!kvk) return fail(404, { error: t(locals.lang, "err.kvkNotFound") });
		const allowed =
			kvk.kingdom_id == null
				? isAdmin(locals.user)
				: isKingdomManager(locals.user, kvk.kingdom_id);
		if (!allowed) return fail(403, { error: t(locals.lang, "err.forbidden") });

		const form = await request.formData();
		const name = String(form.get("name") || "").trim();
		if (!name || name.length > 100)
			return fail(400, { error: t(locals.lang, "kvko.errName") });

		// No-op rename: nothing to do, just re-render.
		if (name === kvk.name) return { renamed: true, name };

		// Name must stay unique (same rule as KvK creation).
		const dupName = await db
			.prepare("SELECT id FROM kvks WHERE name = ? AND id != ?")
			.bind(name, kvk.id)
			.first<{ id: number }>();
		if (dupName)
			return fail(400, { error: t(locals.lang, "err.kvkNameExists", { name }) });

		// Derive the slug from the name; fall back to an id-based slug when the
		// name has no usable latin characters (e.g. a fully non-latin name).
		const slug = slugify(name) || `kvk-${kvk.id}`;
		const dupSlug = await db
			.prepare("SELECT id FROM kvks WHERE slug = ? AND id != ?")
			.bind(slug, kvk.id)
			.first<{ id: number }>();
		if (dupSlug)
			return fail(400, { error: t(locals.lang, "err.kvkSlugExists", { slug }) });

		await updateKvk(db, kvk.id, { name, slug });

		// The current URL carries the old slug, so send the client to the new one.
		throw redirect(303, `/admin/kvks/${slug}`);
	},

	// Close (archive) the KvK. Irreversible. Auto-finalizes DKP → coins.
	closeKvk: async ({ platform, params, locals }) => {
		const db = getDb(platform);
		const kvk = await getKvkBySlug(db, params.kvkSlug);
		if (!kvk) return fail(404, { error: t(locals.lang, "err.kvkNotFound") });
		if (kvk.kingdom_id == null)
			return fail(400, { error: t(locals.lang, "err.kvkNotFound") });
		if (!isKingdomManager(locals.user, kvk.kingdom_id))
			return fail(403, { error: t(locals.lang, "err.forbidden") });
		if (kvk.status === "archived")
			return fail(400, { error: t(locals.lang, "kvko.err.alreadyClosed") });

		const kingdom = await getKingdomById(db, kvk.kingdom_id);
		const keepPct = kingdom?.coin_keep_pct ?? 100;

		// Finalize coins (idempotent) then archive irreversibly.
		const r = await convertDkpToCoins(
			db,
			kvk.kingdom_id,
			kvk.id,
			{ keepPct, rate: 1 },
			locals.user!.id,
		);
		await updateKvk(db, kvk.id, { status: "archived" });

		return {
			closed: true,
			granted: r.granted,
			members: r.members,
			keepPct,
			alreadyConverted: r.alreadyDone,
		};
	},
};
