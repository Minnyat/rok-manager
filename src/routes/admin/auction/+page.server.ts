import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getDb } from "$lib/server/db";
import { t } from "$lib/i18n";
import { isKingdomManager } from "$lib/server/permissions";
import { getDefaultKvk } from "$lib/server/kvk";
import { getWalletsForKingdom } from "$lib/server/dkp";
import {
	createAuction,
	getLiveAuction,
	getAuctionById,
	getPublicReveal,
	closeAuctionNow,
	confirmSettlement,
	cancelResult,
	adjustResult,
	refreshAuctionStatus,
	type Auction,
} from "$lib/server/auction";

/** Parse a `datetime-local` value (YYYY-MM-DDTHH:MM) as UTC → epoch seconds. */
function parseUtc(value: string): number | null {
	if (!value) return null;
	const ms = Date.parse(value.length === 16 ? value + ":00Z" : value + "Z");
	return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
}

export const load: PageServerLoad = async ({ platform, locals }) => {
	const db = getDb(platform);
	const kingdomId = locals.user?.kingdomId ?? null;
	if (kingdomId == null) {
		return { kingdomScoped: false, auction: null, reveal: null, results: [], audit: [], wallets: [] };
	}

	let auction: Auction | null = await getLiveAuction(db, kingdomId);
	if (!auction) {
		const latest = await db
			.prepare("SELECT * FROM auctions WHERE kingdom_id = ? ORDER BY id DESC LIMIT 1")
			.bind(kingdomId)
			.first<Auction>();
		auction = latest ? await refreshAuctionStatus(db, latest) : null;
	}

	let reveal: Awaited<ReturnType<typeof getPublicReveal>> | null = null;
	let results: any[] = [];
	let audit: any[] = [];

	if (auction) {
		reveal = await getPublicReveal(db, auction);
		if (auction.status === "settled" || auction.status === "cancelled") {
			const rows = await db
				.prepare(
					`SELECT r.id, r.user_id, r.governor_id, r.rank, r.sculptures, r.unit_paid,
					        r.total_cost, r.status, u.username
					 FROM auction_results r JOIN users u ON u.id = r.user_id
					 WHERE r.auction_id = ? ORDER BY r.rank ASC`,
				)
				.bind(auction.id)
				.all();
			results = rows.results;
		}
		const auditRows = await db
			.prepare(
				`SELECT a.id, a.action, a.target_user_id, a.detail_json, a.reason, a.created_at,
				        u.username AS actor, tu.username AS target
				 FROM auction_audit_log a
				 LEFT JOIN users u ON u.id = a.actor_user_id
				 LEFT JOIN users tu ON tu.id = a.target_user_id
				 WHERE a.auction_id = ? ORDER BY a.id DESC`,
			)
			.bind(auction.id)
			.all();
		audit = auditRows.results;
	}

	const wallets = await getWalletsForKingdom(db, kingdomId);
	return { kingdomScoped: true, auction, reveal, results, audit, wallets };
};

function requireKingdom(locals: App.Locals): number | null {
	return locals.user?.kingdomId ?? null;
}

export const actions: Actions = {
	create: async ({ request, platform, locals }) => {
		const db = getDb(platform);
		const kingdomId = requireKingdom(locals);
		if (kingdomId == null || !isKingdomManager(locals.user, kingdomId))
			return fail(403, { error: t(locals.lang, "err.forbidden") });

		const form = await request.formData();
		const title = String(form.get("title") || "").trim();
		const increment = Number(form.get("increment") ?? 1);
		const reserve = Number(form.get("reserve") ?? 1);
		const softClose = Number(form.get("softClose") ?? 5);
		const opensAt = parseUtc(String(form.get("opensAt") || ""));
		const closesAt = parseUtc(String(form.get("closesAt") || ""));

		if (!title) return fail(400, { error: t(locals.lang, "auction.err.title") });
		if (opensAt == null || closesAt == null)
			return fail(400, { error: t(locals.lang, "auction.err.times") });

		// Reference KvK (for the DKP tiebreak only): the kingdom's latest KvK, if any.
		const refKvk = await getDefaultKvk(db, kingdomId);

		try {
			await createAuction(
				db,
				kingdomId,
				refKvk?.id ?? null,
				{ title, increment, reserve, opensAt, closesAt, softCloseMinutes: softClose },
				locals.user!.id,
			);
		} catch (e: any) {
			return fail(400, { error: t(locals.lang, "err.generic", { msg: e.message }) });
		}
		return { auctionCreated: true };
	},

	closeNow: async ({ request, platform, locals }) => {
		const db = getDb(platform);
		const kingdomId = requireKingdom(locals);
		if (kingdomId == null || !isKingdomManager(locals.user, kingdomId))
			return fail(403, { error: t(locals.lang, "err.forbidden") });
		const auction = await getAuctionGuarded(db, request, kingdomId);
		if (!auction) return fail(404, { error: t(locals.lang, "auction.err.notFound") });
		await closeAuctionNow(db, auction, locals.user!.id);
		return { closed: true };
	},

	settle: async ({ request, platform, locals }) => {
		const db = getDb(platform);
		const kingdomId = requireKingdom(locals);
		if (kingdomId == null || !isKingdomManager(locals.user, kingdomId))
			return fail(403, { error: t(locals.lang, "err.forbidden") });
		const auction = await getAuctionGuarded(db, request, kingdomId);
		if (!auction) return fail(404, { error: t(locals.lang, "auction.err.notFound") });
		try {
			const r = await confirmSettlement(db, auction, locals.user!.id);
			return { settled: true, winners: r.winners, charged: r.charged };
		} catch (e: any) {
			return fail(400, { error: t(locals.lang, "err.generic", { msg: e.message }) });
		}
	},

	cancelResult: async ({ request, platform, locals }) => {
		const db = getDb(platform);
		const kingdomId = requireKingdom(locals);
		if (kingdomId == null || !isKingdomManager(locals.user, kingdomId))
			return fail(403, { error: t(locals.lang, "err.forbidden") });
		const form = await request.formData();
		const resultId = Number(form.get("resultId"));
		const reason = String(form.get("reason") || "").trim();
		if (!resultId) return fail(400, { error: t(locals.lang, "auction.err.notFound") });
		if (!reason) return fail(400, { error: t(locals.lang, "auction.err.reason") });
		try {
			await cancelResult(db, resultId, reason, locals.user!.id);
			return { resultCancelled: true };
		} catch (e: any) {
			return fail(400, { error: t(locals.lang, "err.generic", { msg: e.message }) });
		}
	},

	adjustResult: async ({ request, platform, locals }) => {
		const db = getDb(platform);
		const kingdomId = requireKingdom(locals);
		if (kingdomId == null || !isKingdomManager(locals.user, kingdomId))
			return fail(403, { error: t(locals.lang, "err.forbidden") });
		const form = await request.formData();
		const resultId = Number(form.get("resultId"));
		const newRank = Number(form.get("newRank"));
		const reason = String(form.get("reason") || "").trim();
		if (!resultId) return fail(400, { error: t(locals.lang, "auction.err.notFound") });
		if (!reason) return fail(400, { error: t(locals.lang, "auction.err.reason") });
		try {
			await adjustResult(db, resultId, newRank, reason, locals.user!.id);
			return { resultAdjusted: true };
		} catch (e: any) {
			return fail(400, { error: t(locals.lang, "err.generic", { msg: e.message }) });
		}
	},
};

/** Load the kingdom's current auction and ensure the posted id matches it. */
async function getAuctionGuarded(
	db: D1Database,
	request: Request,
	kingdomId: number,
): Promise<Auction | null> {
	const form = await request.formData();
	const id = Number(form.get("auctionId"));
	if (!id) return null;
	const a = await getAuctionById(db, id);
	if (!a || a.kingdom_id !== kingdomId) return null;
	return refreshAuctionStatus(db, a);
}
