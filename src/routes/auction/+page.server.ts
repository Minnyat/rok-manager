import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getDb } from "$lib/server/db";
import { t } from "$lib/i18n";
import {
	getLiveAuction,
	getAuctionView,
	getPublicReveal,
	placeBid,
	refreshAuctionStatus,
	type Auction,
} from "$lib/server/auction";

export const load: PageServerLoad = async ({ platform, locals }) => {
	if (!locals.user) throw redirect(303, "/login");
	const db = getDb(platform);
	const kingdomId = locals.user.kingdomId;
	if (kingdomId == null) return { view: null, reveal: null };

	let auction: Auction | null = await getLiveAuction(db, kingdomId);
	if (!auction) {
		const latest = await db
			.prepare(
				"SELECT * FROM auctions WHERE kingdom_id = ? ORDER BY id DESC LIMIT 1",
			)
			.bind(kingdomId)
			.first<Auction>();
		auction = latest ? await refreshAuctionStatus(db, latest) : null;
	}
	if (!auction) return { view: null, reveal: null };

	const view = await getAuctionView(db, auction, locals.user.id);
	const reveal =
		auction.status === "open" || auction.status === "draft"
			? null
			: await getPublicReveal(db, auction);

	return { view, reveal };
};

export const actions: Actions = {
	bid: async ({ request, platform, locals }) => {
		if (!locals.user) return fail(401, { error: "unauthorized" });
		const db = getDb(platform);
		const kingdomId = locals.user.kingdomId;
		if (kingdomId == null)
			return fail(400, { error: t(locals.lang, "auction.err.noKingdom") });

		const auction = await getLiveAuction(db, kingdomId);
		if (!auction || auction.status !== "open")
			return fail(400, { error: t(locals.lang, "auction.err.notOpen") });

		const form = await request.formData();
		const unitPrice = Number(form.get("unitPrice"));
		if (!Number.isInteger(unitPrice) || unitPrice <= 0)
			return fail(400, { error: t(locals.lang, "auction.err.invalidBid") });

		const member = await db
			.prepare(
				"SELECT governor_id FROM kingdom_members WHERE kingdom_id = ? AND user_id = ? AND status = 'active'",
			)
			.bind(kingdomId, locals.user.id)
			.first<{ governor_id: number }>();

		const r = await placeBid(
			db,
			auction,
			locals.user.id,
			member?.governor_id ?? null,
			unitPrice,
		);

		if (!r.ok) {
			const map: Record<string, string> = {
				notOpen: t(locals.lang, "auction.err.notOpen"),
				closed: t(locals.lang, "auction.err.closed"),
				invalid: t(locals.lang, "auction.err.invalidBid"),
				tooLow: t(locals.lang, "auction.err.tooLow", { min: r.min ?? 0 }),
				insufficient: t(locals.lang, "auction.err.insufficient", {
					needed: r.needed ?? 0,
					balance: r.balance ?? 0,
				}),
			};
			return fail(400, { error: map[r.error] ?? r.error });
		}

		return {
			bidPlaced: true,
			newRank: r.newRank,
			cost: r.cost,
			extended: r.extendedTo != null,
		};
	},
};
