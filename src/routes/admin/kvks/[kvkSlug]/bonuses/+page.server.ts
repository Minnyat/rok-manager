import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getDb } from "$lib/server/db";
import { calculateScores } from "$lib/server/scores";
import { getActiveVersionForKvk } from "$lib/server/kvk";
import { isAdmin, isKingdomManager } from "$lib/server/permissions";
import { t } from "$lib/i18n";

export const load: PageServerLoad = async ({ platform, parent }) => {
	const db = getDb(platform);
	const { kvk, activeVersion } = await parent();

	let bonuses: any[] = [];
	try {
		const rows = await db
			.prepare(
				`SELECT br.id, br.governor_id, br.user_id, br.bonus_pct, br.note,
				        br.created_at, br.updated_at
				 FROM kvk_bonus_recipients br
				 WHERE br.kvk_id = ?
				 ORDER BY br.updated_at DESC`,
			)
			.bind(kvk.id)
			.all();
		bonuses = rows.results;
	} catch {
		// kvk_bonus_recipients may not exist yet
	}

	if (activeVersion && bonuses.length > 0) {
		const enriched = [];
		for (const b of bonuses) {
			const player = await db
				.prepare(
					`SELECT governor_name, power FROM player_data
					 WHERE version_id = ? AND governor_id = ? LIMIT 1`,
				)
				.bind(activeVersion.id, b.governor_id)
				.first<{ governor_name: string; power: number }>();

			const score = await db
				.prepare(
					`SELECT dkp_base, dkp_raw, bonus_amount FROM player_scores
					 WHERE version_id = ? AND governor_id = ? LIMIT 1`,
				)
				.bind(activeVersion.id, b.governor_id)
				.first<{ dkp_base: number; dkp_raw: number; bonus_amount: number }>();

			enriched.push({
				...b,
				governor_name: player?.governor_name ?? `ID: ${b.governor_id}`,
				power: player?.power ?? 0,
				dkp_base: score?.dkp_base ?? 0,
				dkp_raw: score?.dkp_raw ?? 0,
				bonus_amount: score?.bonus_amount ?? 0,
			});
		}
		bonuses = enriched;
	}

	return { bonuses, activeVersion };
};

export const actions: Actions = {
	add: async ({ request, platform, params, locals }) => {
		const db = getDb(platform);
		const kvk = await db
			.prepare("SELECT id, kingdom_id FROM kvks WHERE slug = ?")
			.bind(params.kvkSlug)
			.first<{ id: number; kingdom_id: number | null }>();
		if (!kvk) return fail(404, { error: t(locals.lang, "err.kvkNotFound") });
		const allowed = kvk.kingdom_id == null ? isAdmin(locals.user) : isKingdomManager(locals.user, kvk.kingdom_id);
		if (!allowed) return fail(403, { error: t(locals.lang, "err.forbidden") });

		const form = await request.formData();
		const governorId = Number(form.get("governorId"));
		const bonusPct = parseFloat(String(form.get("bonusPct") || "0"));
		const note = String(form.get("note") || "").trim() || null;

		if (!governorId || governorId <= 0)
			return fail(400, { error: t(locals.lang, "err.invalidGovernorId") });
		if (isNaN(bonusPct) || bonusPct < -100 || bonusPct > 100) {
			return fail(400, { error: t(locals.lang, "err.bonusRange") });
		}

		try {
			await db
				.prepare(
					`INSERT INTO kvk_bonus_recipients (kvk_id, governor_id, user_id, bonus_pct, note, created_by, updated_by, created_at, updated_at)
					 VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())
					 ON CONFLICT(kvk_id, governor_id) DO UPDATE SET
					   bonus_pct = excluded.bonus_pct,
					   note = excluded.note,
					   updated_by = excluded.updated_by,
					   updated_at = excluded.updated_at`,
				)
				.bind(
					kvk.id,
					governorId,
					null,
					bonusPct,
					note,
					locals.user?.id ?? null,
					locals.user?.id ?? null,
				)
				.run();
		} catch (e: any) {
			return fail(400, { error: t(locals.lang, "err.generic", { msg: e.message }) });
		}

		const activeVersion = await getActiveVersionForKvk(db, kvk.id);
		let count = 0;
		if (activeVersion) {
			count = await calculateScores(db, activeVersion.id);
		}

		return { bonusAdded: true, count };
	},

	edit: async ({ request, platform, params, locals }) => {
		const db = getDb(platform);
		const kvk = await db
			.prepare("SELECT id, kingdom_id FROM kvks WHERE slug = ?")
			.bind(params.kvkSlug)
			.first<{ id: number; kingdom_id: number | null }>();
		if (!kvk) return fail(404, { error: t(locals.lang, "err.kvkNotFound") });
		const allowed = kvk.kingdom_id == null ? isAdmin(locals.user) : isKingdomManager(locals.user, kvk.kingdom_id);
		if (!allowed) return fail(403, { error: t(locals.lang, "err.forbidden") });

		const form = await request.formData();
		const id = Number(form.get("id"));
		const bonusPct = parseFloat(String(form.get("bonusPct") || "0"));
		const note = String(form.get("note") || "").trim() || null;

		if (!id) return fail(400, { error: "Invalid ID" });
		if (isNaN(bonusPct) || bonusPct < -100 || bonusPct > 100) {
			return fail(400, { error: t(locals.lang, "err.bonusRange") });
		}

		await db
			.prepare(
				`UPDATE kvk_bonus_recipients SET bonus_pct = ?, note = ?, updated_by = ?, updated_at = unixepoch()
				 WHERE id = ? AND kvk_id = ?`,
			)
			.bind(bonusPct, note, locals.user?.id ?? null, id, kvk.id)
			.run();

		const activeVersion = await getActiveVersionForKvk(db, kvk.id);
		let count = 0;
		if (activeVersion) {
			count = await calculateScores(db, activeVersion.id);
		}

		return { bonusUpdated: true, count };
	},

	remove: async ({ request, platform, params, locals }) => {
		const db = getDb(platform);
		const kvk = await db
			.prepare("SELECT id, kingdom_id FROM kvks WHERE slug = ?")
			.bind(params.kvkSlug)
			.first<{ id: number; kingdom_id: number | null }>();
		if (!kvk) return fail(404, { error: t(locals.lang, "err.kvkNotFound") });
		const allowed = kvk.kingdom_id == null ? isAdmin(locals.user) : isKingdomManager(locals.user, kvk.kingdom_id);
		if (!allowed) return fail(403, { error: t(locals.lang, "err.forbidden") });

		const form = await request.formData();
		const id = Number(form.get("id"));

		if (!id) return fail(400, { error: "Invalid ID" });

		await db
			.prepare("DELETE FROM kvk_bonus_recipients WHERE id = ? AND kvk_id = ?")
			.bind(id, kvk.id)
			.run();

		const activeVersion = await getActiveVersionForKvk(db, kvk.id);
		let count = 0;
		if (activeVersion) {
			count = await calculateScores(db, activeVersion.id);
		}

		return { bonusRemoved: true, count };
	},
};
