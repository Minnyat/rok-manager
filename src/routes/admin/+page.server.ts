import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';

export const load: PageServerLoad = async ({ platform }) => {
	const db = getDb(platform);

	const userCount = await db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').first<{ count: number }>();
	const pendingInvites = await db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 0 AND invite_token IS NOT NULL').first<{ count: number }>();
	const activeVersion = await db.prepare('SELECT name, row_count, imported_at FROM data_versions WHERE is_active = 1 LIMIT 1').first<{ name: string; row_count: number; imported_at: number }>();
	const versionCount = await db.prepare('SELECT COUNT(*) as count FROM data_versions').first<{ count: number }>();
	const pendingReports = await db.prepare("SELECT COUNT(*) as count FROM account_reports WHERE status = 'pending'").first<{ count: number }>();
	const linkCount = await db.prepare('SELECT COUNT(*) as count FROM account_links').first<{ count: number }>();

	const activeVersionRow = await db
		.prepare('SELECT id FROM data_versions WHERE is_active = 1 LIMIT 1')
		.first<{ id: number }>();

	let groupedLinks: any[] = [];
	if (activeVersionRow) {
		const vId = activeVersionRow.id;
		const links = await db
			.prepare(
				`SELECT u.username, u.main_governor_id, al.governor_id AS farm_governor_id
				 FROM account_links al
				 JOIN users u ON u.id = al.user_id
				 ORDER BY u.username`
			)
			.all<{ username: string; main_governor_id: number; farm_governor_id: number }>();

		const govIds = new Set<number>();
		for (const l of links.results) {
			govIds.add(l.main_governor_id);
			govIds.add(l.farm_governor_id);
		}

		const infoMap = new Map<number, { name: string; power: number; dkp: number }>();
		for (const id of govIds) {
			const p = await db
				.prepare('SELECT governor_name, power FROM player_data WHERE version_id = ? AND governor_id = ? LIMIT 1')
				.bind(vId, id)
				.first<{ governor_name: string; power: number }>();
			const sc = await db
				.prepare('SELECT dkp_raw, dkp_combined, farm_contribution FROM player_scores WHERE version_id = ? AND governor_id = ? LIMIT 1')
				.bind(vId, id)
				.first<{ dkp_raw: number; dkp_combined: number; farm_contribution: number }>();
			infoMap.set(id, {
				name: p?.governor_name ?? `#${id}`,
				power: p?.power ?? 0,
				dkp: sc?.dkp_raw ?? 0
			});
		}

		const byUser = new Map<string, any>();
		for (const l of links.results) {
			const key = `${l.username}:${l.main_governor_id}`;
			if (!byUser.has(key)) {
				const mainInfo = infoMap.get(l.main_governor_id)!;
				const mainScore = await db
					.prepare('SELECT dkp_combined, farm_contribution FROM player_scores WHERE version_id = ? AND governor_id = ? LIMIT 1')
					.bind(vId, l.main_governor_id)
					.first<{ dkp_combined: number; farm_contribution: number }>();
				byUser.set(key, {
					username: l.username,
					mainId: l.main_governor_id,
					mainName: mainInfo.name,
					mainPower: mainInfo.power,
					dkpCombined: mainScore?.dkp_combined ?? 0,
					farmContribution: mainScore?.farm_contribution ?? 0,
					farms: []
				});
			}
			const farmInfo = infoMap.get(l.farm_governor_id)!;
			byUser.get(key).farms.push({
				id: l.farm_governor_id,
				name: farmInfo.name,
				power: farmInfo.power,
				dkp: farmInfo.dkp
			});
		}
		groupedLinks = [...byUser.values()];
	}

	return {
		stats: {
			activeUsers: userCount?.count ?? 0,
			pendingInvites: pendingInvites?.count ?? 0,
			activeVersion: activeVersion,
			totalVersions: versionCount?.count ?? 0,
			pendingReports: pendingReports?.count ?? 0,
			totalLinks: linkCount?.count ?? 0
		},
		groupedLinks
	};
};
