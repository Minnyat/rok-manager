import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getDb } from "$lib/server/db";
import { hashPassword, verifyPassword } from "$lib/server/auth";
import {
	getKingdomById,
	getKingdomByNumber,
	governorExistsInKingdom,
	applyTransfer,
	type PendingTransfer,
} from "$lib/server/kingdom";
import { t } from "$lib/i18n";

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) throw redirect(303, "/login");
	const user = locals.user;

	// Kingdom transfer lives in Settings too. Skip it for the system admin (who
	// manages kingdoms elsewhere) and during a forced password change.
	let transfer = null;
	if (user.role !== "admin" && !user.mustChangePassword) {
		const db = getDb(platform);
		const currentKingdom = user.kingdomId
			? await getKingdomById(db, user.kingdomId)
			: null;

		// Invites a King/R4 sent to me.
		const invites = await db
			.prepare(
				`SELECT kt.id, kt.role, kt.created_at, k.number AS to_number, k.display_name AS to_name
				 FROM kingdom_transfers kt JOIN kingdoms k ON k.id = kt.to_kingdom_id
				 WHERE kt.user_id = ? AND kt.initiated_by = 'king' AND kt.status = 'pending'
				 ORDER BY kt.created_at DESC`,
			)
			.bind(user.id)
			.all();

		// Join requests I sent.
		const requests = await db
			.prepare(
				`SELECT kt.id, kt.role, kt.created_at, k.number AS to_number, k.display_name AS to_name
				 FROM kingdom_transfers kt JOIN kingdoms k ON k.id = kt.to_kingdom_id
				 WHERE kt.user_id = ? AND kt.initiated_by = 'member' AND kt.status = 'pending'
				 ORDER BY kt.created_at DESC`,
			)
			.bind(user.id)
			.all();

		transfer = {
			currentKingdom,
			invites: invites.results,
			requests: requests.results,
			governorId: user.mainGovernorId,
		};
	}

	return {
		username: user.username,
		mainGovernorId: user.mainGovernorId,
		kingdomRole: user.kingdomRole,
		// When true the page shows the one-time-password change form (no current
		// password required — they just authenticated with the temp one).
		mustChange: user.mustChangePassword,
		transfer,
	};
};

export const actions: Actions = {
	changePassword: async ({ request, locals, platform }) => {
		if (!locals.user) throw redirect(303, "/login");
		const user = locals.user;

		const form = await request.formData();
		const currentPassword = String(form.get("currentPassword") || "");
		const newPassword = String(form.get("newPassword") || "");
		const confirmPassword = String(form.get("confirmPassword") || "");

		if (newPassword.length < 6) {
			return fail(400, { error: t(locals.lang, "err.passwordMin6") });
		}
		if (newPassword !== confirmPassword) {
			return fail(400, { error: t(locals.lang, "err.passwordMismatch") });
		}

		const db = getDb(platform);
		const row = await db
			.prepare("SELECT password_hash FROM users WHERE id = ?")
			.bind(user.id)
			.first<{ password_hash: string | null }>();
		if (!row?.password_hash) {
			return fail(400, { error: t(locals.lang, "err.accountNotFound") });
		}

		// Self-service change requires the current password. The forced one-time
		// flow skips it — the temp password they just logged in with is the proof.
		if (!user.mustChangePassword) {
			const valid = await verifyPassword(currentPassword, row.password_hash);
			if (!valid) {
				return fail(400, { error: t(locals.lang, "err.currentPasswordWrong") });
			}
			if (await verifyPassword(newPassword, row.password_hash)) {
				return fail(400, { error: t(locals.lang, "err.passwordSameAsOld") });
			}
		}

		const hash = await hashPassword(newPassword);
		await db
			.prepare(
				"UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?",
			)
			.bind(hash, Math.floor(Date.now() / 1000), user.id)
			.run();

		// Forced flow: drop them onto the dashboard now that the account is theirs.
		if (user.mustChangePassword) {
			throw redirect(303, "/dashboard");
		}

		return { changed: true };
	},

	// --- Kingdom transfer (moved here from /kingdom/transfer) ---

	// Request to join another kingdom (gated by governor presence in its data).
	requestJoin: async ({ request, locals, platform }) => {
		if (!locals.user) throw redirect(303, "/login");
		const user = locals.user;

		const form = await request.formData();
		const number = String(form.get("number") || "").trim();
		if (!/^\d{3,5}$/.test(number)) {
			return fail(400, { error: t(locals.lang, "err.invalidKingdomNumber") });
		}

		const db = getDb(platform);
		const target = await getKingdomByNumber(db, number);
		if (!target) return fail(400, { error: t(locals.lang, "err.kingdomNotFoundNum", { number }) });
		if (target.status !== "active") {
			return fail(400, { error: t(locals.lang, "err.kingdomNotAccepting") });
		}
		if (user.kingdomId === target.id) {
			return fail(400, { error: t(locals.lang, "err.alreadyInKingdom") });
		}

		// Gate: the member's governor must exist in the target kingdom's data.
		const ok = await governorExistsInKingdom(db, target.id, user.mainGovernorId);
		if (!ok) {
			return fail(400, {
				error: t(locals.lang, "err.governorNotInTargetKd", {
					gov: user.mainGovernorId,
					number,
				}),
			});
		}

		const dup = await db
			.prepare(
				"SELECT id FROM kingdom_transfers WHERE user_id = ? AND to_kingdom_id = ? AND status = 'pending'",
			)
			.bind(user.id, target.id)
			.first();
		if (dup) {
			return fail(400, { error: t(locals.lang, "err.pendingWithKingdom") });
		}

		await db
			.prepare(
				`INSERT INTO kingdom_transfers (user_id, governor_id, from_kingdom_id, to_kingdom_id, initiated_by, role, status, created_by)
				 VALUES (?, ?, ?, ?, 'member', 'member', 'pending', ?)`,
			)
			.bind(user.id, user.mainGovernorId, user.kingdomId ?? null, target.id, user.id)
			.run();

		return { requested: true };
	},

	cancelRequest: async ({ request, locals, platform }) => {
		if (!locals.user) throw redirect(303, "/login");
		const form = await request.formData();
		const transferId = Number(form.get("transferId"));
		if (!transferId) return fail(400, { error: t(locals.lang, "err.missingRequest") });

		const db = getDb(platform);
		await db
			.prepare(
				"UPDATE kingdom_transfers SET status = 'cancelled', resolved_at = unixepoch() WHERE id = ? AND user_id = ? AND initiated_by = 'member' AND status = 'pending'",
			)
			.bind(transferId, locals.user.id)
			.run();

		return { cancelled: true };
	},

	// Accept a King's invite → perform the move (freeze old, activate new, carry farms).
	acceptInvite: async ({ request, locals, platform }) => {
		if (!locals.user) throw redirect(303, "/login");
		const user = locals.user;

		const form = await request.formData();
		const transferId = Number(form.get("transferId"));
		if (!transferId) return fail(400, { error: t(locals.lang, "err.missingInvite") });

		const db = getDb(platform);
		const tr = await db
			.prepare(
				"SELECT * FROM kingdom_transfers WHERE id = ? AND user_id = ? AND initiated_by = 'king' AND status = 'pending'",
			)
			.bind(transferId, user.id)
			.first<PendingTransfer>();
		if (!tr) return fail(404, { error: t(locals.lang, "err.inviteNotFound") });

		const ok = await governorExistsInKingdom(db, tr.to_kingdom_id, tr.governor_id);
		if (!ok) {
			return fail(400, {
				error: t(locals.lang, "err.governorGoneFromKd"),
			});
		}

		await applyTransfer(db, tr, user.id);
		return { accepted: true };
	},

	declineInvite: async ({ request, locals, platform }) => {
		if (!locals.user) throw redirect(303, "/login");
		const form = await request.formData();
		const transferId = Number(form.get("transferId"));
		if (!transferId) return fail(400, { error: t(locals.lang, "err.missingInvite") });

		const db = getDb(platform);
		await db
			.prepare(
				"UPDATE kingdom_transfers SET status = 'rejected', resolved_by = ?, resolved_at = unixepoch() WHERE id = ? AND user_id = ? AND initiated_by = 'king' AND status = 'pending'",
			)
			.bind(locals.user.id, transferId, locals.user.id)
			.run();

		return { declined: true };
	},
};
