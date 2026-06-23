import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getDb } from "$lib/server/db";
import {
	getKingdomById,
	getMembers,
	setMemberRole,
	freezeMembership,
	applyTransfer,
	governorExistsInKingdom,
	getActiveMembership,
} from "$lib/server/kingdom";
import { createInviteToken } from "$lib/server/auth";
import { issueTempPassword } from "$lib/server/password";
import { isAdmin, canInvite, isKing, canManageMembers } from "$lib/server/permissions";
import { t } from "$lib/i18n";

export const load: PageServerLoad = async ({ locals, platform, url }) => {
	const user = locals.user!;
	// System admin manages members from the per-kingdom detail page.
	if (isAdmin(user) || !user.kingdomId) throw redirect(303, "/admin/kingdoms");
	if (user.kingdomRole !== "king" && user.kingdomRole !== "r4") {
		throw redirect(303, "/dashboard");
	}

	const db = getDb(platform);
	const kingdom = await getKingdomById(db, user.kingdomId);
	if (!kingdom) throw redirect(303, "/dashboard");

	const members = await getMembers(db, kingdom.id);

	// Pending transfers targeting this kingdom (join requests + king invites).
	const transfers = await db
		.prepare(
			`SELECT kt.*, u.username
			 FROM kingdom_transfers kt JOIN users u ON u.id = kt.user_id
			 WHERE kt.to_kingdom_id = ? AND kt.status = 'pending'
			 ORDER BY kt.created_at DESC`,
		)
		.bind(kingdom.id)
		.all();

	// Pending forgot-password requests routed to this kingdom.
	const resetRequests = await db
		.prepare(
			`SELECT prr.id, prr.note, prr.created_at, u.username,
			        u.main_governor_id AS governor_id
			 FROM password_reset_requests prr JOIN users u ON u.id = prr.user_id
			 WHERE prr.kingdom_id = ? AND prr.status = 'pending'
			 ORDER BY prr.created_at DESC`,
		)
		.bind(kingdom.id)
		.all();

	return {
		kingdom,
		members,
		transfers: transfers.results,
		resetRequests: resetRequests.results,
		baseUrl: url.origin,
		isKing: user.kingdomRole === "king",
	};
};

export const actions: Actions = {
	// Invite a brand-new member account into this kingdom (Admin/King/R4).
	inviteMember: async ({ request, locals, platform, url }) => {
		const user = locals.user!;
		if (!user.kingdomId || !canInvite(user, user.kingdomId)) {
			return fail(403, { error: t(locals.lang, "err.noPermission") });
		}

		const form = await request.formData();
		const governorId = Number(form.get("governorId"));
		const role = String(form.get("role") || "member");

		if (!governorId || governorId <= 0) {
			return fail(400, { error: t(locals.lang, "err.invalidGovernorId") });
		}
		if (!["member", "r4"].includes(role)) {
			return fail(400, { error: t(locals.lang, "err.invalidRole") });
		}
		// Only the King may grant R4 directly.
		if (role === "r4" && !isKing(user, user.kingdomId)) {
			return fail(403, { error: t(locals.lang, "err.onlyKingInviteR4") });
		}

		const db = getDb(platform);
		const existing = await db
			.prepare("SELECT id FROM users WHERE main_governor_id = ?")
			.bind(governorId)
			.first();
		if (existing) {
			return fail(400, {
				error: t(locals.lang, "err.governorHasAccountUseTransfer", { id: governorId }),
			});
		}

		const token = await createInviteToken(
			db,
			governorId,
			"player",
			user.kingdomId,
			role as "member" | "r4",
		);

		return { success: true, inviteUrl: `${url.origin}/invite/${token}` };
	},

	// Invite an EXISTING account (in another kingdom) to move here. Creates a
	// king-initiated transfer the target accepts from their /settings#transfer page.
	inviteExisting: async ({ request, locals, platform }) => {
		const user = locals.user!;
		if (!user.kingdomId || !canInvite(user, user.kingdomId)) {
			return fail(403, { error: t(locals.lang, "err.noPermission") });
		}

		const form = await request.formData();
		const governorId = Number(form.get("governorId"));
		const role = String(form.get("role") || "member");
		if (!governorId || governorId <= 0) {
			return fail(400, { error: t(locals.lang, "err.invalidGovernorId") });
		}
		if (!["member", "r4"].includes(role)) {
			return fail(400, { error: t(locals.lang, "err.invalidRole") });
		}
		if (role === "r4" && !isKing(user, user.kingdomId)) {
			return fail(403, { error: t(locals.lang, "err.onlyKingInviteR4") });
		}

		const db = getDb(platform);
		const target = await db
			.prepare(
				"SELECT id FROM users WHERE main_governor_id = ? AND is_active = 1",
			)
			.bind(governorId)
			.first<{ id: number }>();
		if (!target) {
			return fail(400, {
				error: t(locals.lang, "err.noActiveAccountForGovernor"),
			});
		}

		// Gate: their governor must already exist in this kingdom's data.
		const ok = await governorExistsInKingdom(db, user.kingdomId, governorId);
		if (!ok) {
			return fail(400, {
				error: t(locals.lang, "err.governorNotInKingdomData"),
			});
		}

		const current = await getActiveMembership(db, target.id);
		if (current?.kingdom_id === user.kingdomId) {
			return fail(400, { error: t(locals.lang, "err.alreadyInYourKingdom") });
		}

		const dup = await db
			.prepare(
				"SELECT id FROM kingdom_transfers WHERE user_id = ? AND to_kingdom_id = ? AND status = 'pending'",
			)
			.bind(target.id, user.kingdomId)
			.first();
		if (dup) {
			return fail(400, { error: t(locals.lang, "err.pendingInviteForUser") });
		}

		await db
			.prepare(
				`INSERT INTO kingdom_transfers (user_id, governor_id, from_kingdom_id, to_kingdom_id, initiated_by, role, status, created_by)
				 VALUES (?, ?, ?, ?, 'king', ?, 'pending', ?)`,
			)
			.bind(
				target.id,
				governorId,
				current?.kingdom_id ?? null,
				user.kingdomId,
				role,
				user.id,
			)
			.run();

		return { invitedExisting: true };
	},

	// Promote/demote between member and R4 (King only).
	setRole: async ({ request, locals, platform }) => {
		const user = locals.user!;
		if (!user.kingdomId || !isKing(user, user.kingdomId)) {
			return fail(403, { error: t(locals.lang, "err.onlyKingChangeR4") });
		}

		const form = await request.formData();
		const userId = Number(form.get("userId"));
		const role = String(form.get("role"));
		if (!userId || !["r4", "member"].includes(role)) {
			return fail(400, { error: t(locals.lang, "err.invalidData") });
		}

		const db = getDb(platform);
		const target = await db
			.prepare(
				"SELECT role FROM kingdom_members WHERE kingdom_id = ? AND user_id = ? AND status = 'active'",
			)
			.bind(user.kingdomId, userId)
			.first<{ role: string }>();
		if (!target) return fail(400, { error: t(locals.lang, "err.memberNotFound") });
		if (target.role === "king") {
			return fail(400, { error: t(locals.lang, "err.cannotChangeKingRole") });
		}

		await setMemberRole(db, user.kingdomId, userId, role as "r4" | "member");
		return { roleUpdated: true };
	},

	// Freeze (remove) a member from this kingdom. Data is preserved, read-only.
	freeze: async ({ request, locals, platform }) => {
		const user = locals.user!;
		if (!user.kingdomId || !canManageMembers(user, user.kingdomId)) {
			return fail(403, { error: t(locals.lang, "err.noPermission") });
		}

		const form = await request.formData();
		const userId = Number(form.get("userId"));
		if (!userId) return fail(400, { error: t(locals.lang, "err.missingUser") });
		if (userId === user.id) {
			return fail(400, { error: t(locals.lang, "err.cannotRemoveSelf") });
		}

		const db = getDb(platform);
		const target = await db
			.prepare(
				"SELECT role FROM kingdom_members WHERE kingdom_id = ? AND user_id = ? AND status = 'active'",
			)
			.bind(user.kingdomId, userId)
			.first<{ role: string }>();
		if (!target) return fail(400, { error: t(locals.lang, "err.memberNotFound") });
		if (target.role === "king") {
			return fail(400, { error: t(locals.lang, "err.cannotRemoveKing") });
		}
		// R4 can only freeze members, not other R4.
		if (target.role === "r4" && !isKing(user, user.kingdomId)) {
			return fail(403, { error: t(locals.lang, "err.onlyKingRemoveR4") });
		}

		await freezeMembership(db, user.kingdomId, userId);
		return { frozen: true };
	},

	// Approve a pending transfer (join request or king invite) into this kingdom.
	approveTransfer: async ({ request, locals, platform }) => {
		const user = locals.user!;
		if (!user.kingdomId || !canManageMembers(user, user.kingdomId)) {
			return fail(403, { error: t(locals.lang, "err.noPermission") });
		}

		const form = await request.formData();
		const transferId = Number(form.get("transferId"));
		if (!transferId) return fail(400, { error: t(locals.lang, "err.missingRequest") });

		const db = getDb(platform);
		const tr = await db
			.prepare(
				"SELECT * FROM kingdom_transfers WHERE id = ? AND to_kingdom_id = ? AND status = 'pending'",
			)
			.bind(transferId, user.kingdomId)
			.first<{
				id: number;
				user_id: number;
				governor_id: number;
				from_kingdom_id: number | null;
				to_kingdom_id: number;
				role: "r4" | "member";
			}>();
		if (!tr) return fail(404, { error: t(locals.lang, "err.requestNotFound") });

		// Re-check the gate: the governor must still exist in this kingdom's data.
		const ok = await governorExistsInKingdom(db, tr.to_kingdom_id, tr.governor_id);
		if (!ok) {
			return fail(400, {
				error: t(locals.lang, "err.governorNotInKingdomCannotApprove"),
			});
		}

		await applyTransfer(db, tr, user.id);
		return { approved: true };
	},

	rejectTransfer: async ({ request, locals, platform }) => {
		const user = locals.user!;
		if (!user.kingdomId || !canManageMembers(user, user.kingdomId)) {
			return fail(403, { error: t(locals.lang, "err.noPermission") });
		}

		const form = await request.formData();
		const transferId = Number(form.get("transferId"));
		if (!transferId) return fail(400, { error: t(locals.lang, "err.missingRequest") });

		const db = getDb(platform);
		await db
			.prepare(
				"UPDATE kingdom_transfers SET status = 'rejected', resolved_by = ?, resolved_at = unixepoch() WHERE id = ? AND to_kingdom_id = ? AND status = 'pending'",
			)
			.bind(user.id, transferId, user.kingdomId)
			.run();

		return { rejected: true };
	},

	// Issue a one-time password for a member (no request needed). King/R4 only.
	// Mirrors the freeze hierarchy: nobody resets the King here; only the King
	// resets an R4; both King and R4 reset members.
	resetPassword: async ({ request, locals, platform }) => {
		const user = locals.user!;
		if (!user.kingdomId || !canManageMembers(user, user.kingdomId)) {
			return fail(403, { error: t(locals.lang, "err.noPermission") });
		}

		const form = await request.formData();
		const userId = Number(form.get("userId"));
		if (!userId) return fail(400, { error: t(locals.lang, "err.missingUser") });
		if (userId === user.id) {
			return fail(400, { error: t(locals.lang, "err.useSettingsForOwnPassword") });
		}

		const db = getDb(platform);
		const target = await db
			.prepare(
				`SELECT km.role, u.username FROM kingdom_members km JOIN users u ON u.id = km.user_id
				 WHERE km.kingdom_id = ? AND km.user_id = ? AND km.status = 'active'`,
			)
			.bind(user.kingdomId, userId)
			.first<{ role: string; username: string | null }>();
		if (!target) return fail(400, { error: t(locals.lang, "err.memberNotFound") });
		if (target.role === "king") {
			return fail(403, { error: t(locals.lang, "err.cannotResetKingPassword") });
		}
		if (target.role === "r4" && !isKing(user, user.kingdomId)) {
			return fail(403, { error: t(locals.lang, "err.onlyKingResetR4Password") });
		}

		const tempPassword = await issueTempPassword(db, userId);
		return { resetUsername: target.username, tempPassword };
	},

	// Resolve a forgot-password request by issuing a one-time password.
	resolveResetRequest: async ({ request, locals, platform }) => {
		const user = locals.user!;
		if (!user.kingdomId || !canManageMembers(user, user.kingdomId)) {
			return fail(403, { error: t(locals.lang, "err.noPermission") });
		}

		const form = await request.formData();
		const requestId = Number(form.get("requestId"));
		if (!requestId) return fail(400, { error: t(locals.lang, "err.missingRequest") });

		const db = getDb(platform);
		const req = await db
			.prepare(
				`SELECT prr.id, prr.user_id, u.username, km.role
				 FROM password_reset_requests prr JOIN users u ON u.id = prr.user_id
				 LEFT JOIN kingdom_members km
				   ON km.user_id = prr.user_id AND km.kingdom_id = ? AND km.status = 'active'
				 WHERE prr.id = ? AND prr.kingdom_id = ? AND prr.status = 'pending'`,
			)
			.bind(user.kingdomId, requestId, user.kingdomId)
			.first<{ id: number; user_id: number; username: string | null; role: string | null }>();
		if (!req) return fail(404, { error: t(locals.lang, "err.requestNotFound") });
		if (req.role === "king") {
			return fail(403, { error: t(locals.lang, "err.cannotResetKingPassword") });
		}
		if (req.role === "r4" && !isKing(user, user.kingdomId)) {
			return fail(403, { error: t(locals.lang, "err.onlyKingResetR4Password") });
		}

		const tempPassword = await issueTempPassword(db, req.user_id);
		await db
			.prepare(
				"UPDATE password_reset_requests SET status = 'resolved', resolved_by = ?, resolved_at = unixepoch() WHERE id = ?",
			)
			.bind(user.id, requestId)
			.run();

		return { resetUsername: req.username, tempPassword };
	},

	rejectResetRequest: async ({ request, locals, platform }) => {
		const user = locals.user!;
		if (!user.kingdomId || !canManageMembers(user, user.kingdomId)) {
			return fail(403, { error: t(locals.lang, "err.noPermission") });
		}

		const form = await request.formData();
		const requestId = Number(form.get("requestId"));
		if (!requestId) return fail(400, { error: t(locals.lang, "err.missingRequest") });

		const db = getDb(platform);
		await db
			.prepare(
				"UPDATE password_reset_requests SET status = 'rejected', resolved_by = ?, resolved_at = unixepoch() WHERE id = ? AND kingdom_id = ? AND status = 'pending'",
			)
			.bind(user.id, requestId, user.kingdomId)
			.run();

		return { rejectedRequest: true };
	},
};
