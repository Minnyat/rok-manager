import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getDb } from "$lib/server/db";
import {
	getLiveAuction,
	getAuctionView,
	nowSec,
} from "$lib/server/auction";

export const GET: RequestHandler = async ({ platform, locals }) => {
	if (!locals.user)
		return json({ ok: false, reason: "unauthorized" }, { status: 401 });

	const db = getDb(platform);
	const kingdomId = locals.user.kingdomId;
	if (kingdomId == null)
		return json({ ok: false, reason: "noKingdom" });

	const auction = await getLiveAuction(db, kingdomId);
	if (!auction)
		return json({ ok: true, view: null, serverNow: nowSec() });

	const view = await getAuctionView(db, auction, locals.user.id);
	return json({ ok: true, view, serverNow: nowSec() });
};
