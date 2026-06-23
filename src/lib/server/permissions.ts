/**
 * Role guards for kingdom-scoped actions.
 *
 * - System admin (users.role='admin') can do anything in any kingdom.
 * - King and R4 manage their own kingdom. Per product decision, R4 can manage
 *   BOTH data and members, but cannot delete the kingdom, change/remove the King,
 *   or edit the storage quota — those are King/admin only.
 * - Account-creation invites can be sent by admin, King, and R4.
 */

type SessionUser = App.Locals["user"];

export function isAdmin(user: SessionUser): boolean {
	return !!user && user.role === "admin";
}

/** King or R4 of the given kingdom (admin always passes). */
export function isKingdomManager(user: SessionUser, kingdomId: number): boolean {
	if (isAdmin(user)) return true;
	return (
		!!user &&
		user.kingdomId === kingdomId &&
		(user.kingdomRole === "king" || user.kingdomRole === "r4")
	);
}

/** King of the given kingdom (admin always passes). King-only privileges. */
export function isKing(user: SessionUser, kingdomId: number): boolean {
	if (isAdmin(user)) return true;
	return !!user && user.kingdomId === kingdomId && user.kingdomRole === "king";
}

/** Import / score / bonus data in this kingdom: admin, King, R4. */
export function canManageData(user: SessionUser, kingdomId: number): boolean {
	return isKingdomManager(user, kingdomId);
}

/** Approve transfers / promote-demote-freeze members: admin, King, R4. */
export function canManageMembers(user: SessionUser, kingdomId: number): boolean {
	return isKingdomManager(user, kingdomId);
}

/** Send account-creation invites: admin, King, R4. */
export function canInvite(user: SessionUser, kingdomId: number): boolean {
	return isKingdomManager(user, kingdomId);
}
