import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getDb } from "$lib/server/db";
import { calculateScores } from "$lib/server/scores";
import { getSelectedKvk, getActiveVersionForKvk } from "$lib/server/kvk";

export const load: PageServerLoad = async ({ locals, platform, url }) => {
	if (!locals.user) throw redirect(303, "/login");

	const db = getDb(platform);
	const kvk = await getSelectedKvk(db, url);
	const activeVersion = kvk ? await getActiveVersionForKvk(db, kvk.id) : null;

	// Load links - try KvK-specific first, fallback to global
	let links: { id: number; governor_id: number }[] = [];
	if (kvk) {
		try {
			const kvkLinks = await db
				.prepare(
					"SELECT id, governor_id FROM kvk_account_links WHERE kvk_id = ? AND user_id = ?",
				)
				.bind(kvk.id, locals.user.id)
				.all<{ id: number; governor_id: number }>();
			links = kvkLinks.results;
		} catch {
			// kvk_account_links may not exist yet
		}
	}

	if (links.length === 0) {
		const globalLinks = await db
			.prepare("SELECT id, governor_id FROM account_links WHERE user_id = ?")
			.bind(locals.user.id)
			.all<{ id: number; governor_id: number }>();
		links = globalLinks.results;
	}

	const subAccounts = [];
	if (activeVersion) {
		for (const link of links) {
			const player = await db
				.prepare(
					"SELECT governor_id, governor_name, power, ranking FROM player_data WHERE version_id = ? AND governor_id = ? LIMIT 1",
				)
				.bind(activeVersion.id, link.governor_id)
				.first();
			subAccounts.push({
				linkId: link.id,
				governorId: link.governor_id,
				...(player || {
					governor_name: `ID: ${link.governor_id}`,
					power: 0,
					ranking: 0,
				}),
			});
		}
	}

	return { subAccounts, kvk };
};

export const actions: Actions = {
	add: async ({ request, locals, platform, url }) => {
		if (!locals.user) throw redirect(303, "/login");

		const form = await request.formData();
		const query = String(form.get("query") || "").trim();
		if (!query)
			return fail(400, { error: "Vui lòng nhập ID hoặc tên governor" });

		const db = getDb(platform);
		const kvk = await getSelectedKvk(db, url);
		const activeVersion = kvk ? await getActiveVersionForKvk(db, kvk.id) : null;

		if (!activeVersion)
			return fail(400, { error: "Chưa có dữ liệu. Liên hệ Admin." });

		let player;
		const numQuery = Number(query);
		if (!isNaN(numQuery) && numQuery > 0) {
			player = await db
				.prepare(
					"SELECT governor_id, governor_name FROM player_data WHERE version_id = ? AND governor_id = ? LIMIT 1",
				)
				.bind(activeVersion.id, numQuery)
				.first<{ governor_id: number; governor_name: string }>();
		}
		if (!player) {
			player = await db
				.prepare(
					"SELECT governor_id, governor_name FROM player_data WHERE version_id = ? AND governor_name LIKE ? LIMIT 1",
				)
				.bind(activeVersion.id, `%${query}%`)
				.first<{ governor_id: number; governor_name: string }>();
		}

		if (!player)
			return fail(404, { error: `Không tìm thấy governor "${query}"`, query });

		if (player.governor_id === locals.user.mainGovernorId) {
			return fail(400, { error: "Đây là tài khoản chính của bạn", query });
		}

		// Check existing link in KvK scope
		if (kvk) {
			try {
				const existingKvkLink = await db
					.prepare(
						"SELECT user_id FROM kvk_account_links WHERE kvk_id = ? AND governor_id = ?",
					)
					.bind(kvk.id, player.governor_id)
					.first<{ user_id: number }>();

				if (existingKvkLink) {
					if (existingKvkLink.user_id === locals.user.id) {
						return fail(400, {
							error: "Bạn đã liên kết tài khoản này rồi",
							query,
						});
					}
					return fail(409, {
						error: `Tài khoản "${player.governor_name}" đã được người khác liên kết`,
						canReport: true,
						disputedGovernorId: player.governor_id,
						disputedGovernorName: player.governor_name,
						query,
					});
				}

				await db
					.prepare(
						`INSERT INTO kvk_account_links (kvk_id, user_id, governor_id, created_by)
						 VALUES (?, ?, ?, ?)`,
					)
					.bind(kvk.id, locals.user.id, player.governor_id, locals.user.id)
					.run();
			} catch {
				// Fallback to global account_links
				await db
					.prepare(
						"INSERT INTO account_links (user_id, governor_id) VALUES (?, ?)",
					)
					.bind(locals.user.id, player.governor_id)
					.run();
			}
		} else {
			await db
				.prepare(
					"INSERT INTO account_links (user_id, governor_id) VALUES (?, ?)",
				)
				.bind(locals.user.id, player.governor_id)
				.run();
		}

		if (activeVersion) await calculateScores(db, activeVersion.id);

		return { added: true };
	},

	remove: async ({ request, locals, platform, url }) => {
		if (!locals.user) throw redirect(303, "/login");

		const form = await request.formData();
		const linkId = Number(form.get("linkId"));
		if (!linkId) return fail(400, { error: "Invalid link ID" });

		const db = getDb(platform);
		const kvk = await getSelectedKvk(db, url);

		// Try KvK-specific delete first
		if (kvk) {
			try {
				await db
					.prepare(
						"DELETE FROM kvk_account_links WHERE id = ? AND user_id = ? AND kvk_id = ?",
					)
					.bind(linkId, locals.user.id, kvk.id)
					.run();
			} catch {
				await db
					.prepare("DELETE FROM account_links WHERE id = ? AND user_id = ?")
					.bind(linkId, locals.user.id)
					.run();
			}
		} else {
			await db
				.prepare("DELETE FROM account_links WHERE id = ? AND user_id = ?")
				.bind(linkId, locals.user.id)
				.run();
		}

		const activeVersion = kvk ? await getActiveVersionForKvk(db, kvk.id) : null;
		if (activeVersion) await calculateScores(db, activeVersion.id);

		return { removed: true };
	},

	report: async ({ request, locals, platform }) => {
		if (!locals.user) throw redirect(303, "/login");

		const form = await request.formData();
		const governorId = Number(form.get("governorId"));
		const message = String(form.get("message") || "").trim();

		if (!governorId) return fail(400, { error: "Invalid governor ID" });

		const db = getDb(platform);
		await db
			.prepare(
				"INSERT INTO account_reports (reporter_user_id, disputed_governor_id, message) VALUES (?, ?, ?)",
			)
			.bind(locals.user.id, governorId, message || null)
			.run();

		return { reported: true };
	},
};
