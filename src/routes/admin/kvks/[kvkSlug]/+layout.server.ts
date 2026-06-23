import { error } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import { getDb } from "$lib/server/db";
import {
	getKvkBySlug,
	getKvkStats,
	getActiveVersionForKvk,
} from "$lib/server/kvk";
import { t } from "$lib/i18n";

export const load: LayoutServerLoad = async ({ platform, params, locals }) => {
	const db = getDb(platform);
	const slug = params.kvkSlug;

	if (!slug) throw error(400, "Missing KvK slug");

	const kvk = await getKvkBySlug(db, slug);
	if (!kvk) throw error(404, t(locals.lang, "err.kvkNotFound"));

	// Tenant isolation: non-admins may only access their own kingdom's KvKs.
	if (locals.user?.role !== "admin" && kvk.kingdom_id !== locals.user?.kingdomId) {
		throw error(403, t(locals.lang, "err.kvkNotYourKingdom"));
	}

	const stats = await getKvkStats(db, kvk.id);
	const activeVersion = await getActiveVersionForKvk(db, kvk.id);

	return { kvk, stats, activeVersion };
};
