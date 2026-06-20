import { error } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import { getDb } from "$lib/server/db";
import {
	getKvkBySlug,
	getKvkStats,
	getActiveVersionForKvk,
} from "$lib/server/kvk";

export const load: LayoutServerLoad = async ({ platform, params }) => {
	const db = getDb(platform);
	const slug = params.kvkSlug;

	if (!slug) throw error(400, "Missing KvK slug");

	const kvk = await getKvkBySlug(db, slug);
	if (!kvk) throw error(404, "Không tìm thấy KvK");

	const stats = await getKvkStats(db, kvk.id);
	const activeVersion = await getActiveVersionForKvk(db, kvk.id);

	return { kvk, stats, activeVersion };
};
