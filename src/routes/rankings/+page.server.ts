import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getDb } from "$lib/server/db";
import { getSelectedKvk, getActiveVersionForKvk } from "$lib/server/kvk";

export const load: PageServerLoad = async ({ locals, platform, url }) => {
	if (!locals.user) throw redirect(303, "/login");

	const db = getDb(platform);
	const kvk = await getSelectedKvk(db, url);

	if (!kvk)
		return {
			players: [],
			versionName: null,
			sort: "ranking",
			dir: "asc",
			view: "combined",
			kvk: null,
		};

	const activeVersion = await getActiveVersionForKvk(db, kvk.id);

	if (!activeVersion)
		return {
			players: [],
			versionName: null,
			sort: "ranking",
			dir: "asc",
			view: "combined",
			kvk,
		};

	const sort = url.searchParams.get("sort") || "rank_combined";
	const dir = url.searchParams.get("dir") || "asc";
	const view = url.searchParams.get("view") || "combined";
	const pageNum = Math.max(
		1,
		parseInt(url.searchParams.get("page") || "1", 10),
	);
	const perPage = 50;

	const allowedSorts: Record<string, string> = {
		ranking: "p.ranking",
		power: "p.power",
		kp: "p.kp",
		t4: "p.t4",
		t5: "p.t5",
		dead: "p.dead",
		dead_t4: "p.dead_t4",
		dead_t5: "p.dead_t5",
		dkp: "p.dkp",
		dkp_raw: "s.dkp_raw",
		dkp_combined: "s.dkp_combined",
		rank_individual: "s.rank_individual",
		rank_combined: "s.rank_combined",
		feeding_rate: "p.feeding_rate",
	};

	const sortCol =
		allowedSorts[sort] ||
		(view === "combined" ? "s.rank_combined" : "s.rank_individual");
	const sortDir = dir === "desc" ? "DESC" : "ASC";

	const totalResult = await db
		.prepare(
			`SELECT COUNT(*) as count
			 FROM player_data p
			 WHERE p.version_id = ?`,
		)
		.bind(activeVersion.id)
		.first<{ count: number }>();

	const total = totalResult?.count ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / perPage));
	const offset = (Math.min(pageNum, totalPages) - 1) * perPage;

	// Join bonus from kvk_bonus_recipients (new) or fallback to users.dkp_bonus_pct (legacy)
	const players = await db
		.prepare(
			`SELECT p.*, s.dkp_raw, s.dkp_combined, s.rank_individual, s.rank_combined, s.farm_contribution,
			        s.dkp_base, s.bonus_pct, s.bonus_amount,
			        COALESCE(br.bonus_pct, u.dkp_bonus_pct, 0) AS display_bonus_pct
			 FROM player_data p
			 LEFT JOIN player_scores s ON s.version_id = p.version_id AND s.governor_id = p.governor_id
			 LEFT JOIN kvk_bonus_recipients br ON br.kvk_id = ? AND br.governor_id = p.governor_id
			 LEFT JOIN users u ON u.main_governor_id = p.governor_id
			 WHERE p.version_id = ?
			 ORDER BY ${sortCol} ${sortDir}
			 LIMIT ? OFFSET ?`,
		)
		.bind(kvk.id, activeVersion.id, perPage, offset)
		.all();

	// Fetch farm stats totals (T4, T5, dead_t4, dead_t5) for combined view
	const farmStatsMap: Record<
		number,
		{ t4: number; t5: number; dead_t4: number; dead_t5: number }
	> = {};
	if (view === "combined" && players.results.length > 0) {
		const mainIds = players.results
			.filter((p: any) => p.farm_contribution > 0)
			.map((p: any) => p.governor_id);

		if (mainIds.length > 0) {
			let rows: {
				main_governor_id: number;
				t4: number;
				t5: number;
				dead_t4: number;
				dead_t5: number;
			}[] = [];
			try {
				const ph = mainIds.map(() => "?").join(",");
				const r = await db
					.prepare(
						`SELECT u.main_governor_id,
							    SUM(pd.t4) AS t4, SUM(pd.t5) AS t5,
							    SUM(pd.dead_t4) AS dead_t4, SUM(pd.dead_t5) AS dead_t5
						 FROM kvk_account_links kal
						 JOIN users u ON u.id = kal.user_id
						 JOIN player_data pd ON pd.version_id = ? AND pd.governor_id = kal.governor_id
						 WHERE kal.kvk_id = ? AND u.main_governor_id IN (${ph})
						 GROUP BY u.main_governor_id`,
					)
					.bind(activeVersion.id, kvk.id, ...mainIds)
					.all();
				rows = r.results as any;
			} catch {
				// kvk_account_links may not exist
			}

			if (rows.length === 0) {
				const ph = mainIds.map(() => "?").join(",");
				const r = await db
					.prepare(
						`SELECT u.main_governor_id,
							    SUM(pd.t4) AS t4, SUM(pd.t5) AS t5,
							    SUM(pd.dead_t4) AS dead_t4, SUM(pd.dead_t5) AS dead_t5
						 FROM account_links al
						 JOIN users u ON u.id = al.user_id
						 JOIN player_data pd ON pd.version_id = ? AND pd.governor_id = al.governor_id
						 WHERE u.main_governor_id IN (${ph})
						 GROUP BY u.main_governor_id`,
					)
					.bind(activeVersion.id, ...mainIds)
					.all();
				rows = r.results as any;
			}

			for (const row of rows) {
				farmStatsMap[row.main_governor_id] = {
					t4: row.t4 ?? 0,
					t5: row.t5 ?? 0,
					dead_t4: row.dead_t4 ?? 0,
					dead_t5: row.dead_t5 ?? 0,
				};
			}
		}
	}

	return {
		players: players.results,
		farmStatsMap,
		versionName: activeVersion.name,
		sort,
		dir,
		view,
		page: Math.min(pageNum, totalPages),
		totalPages,
		total,
		kvk,
	};
};
