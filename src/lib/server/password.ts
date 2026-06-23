/**
 * Password reset helpers.
 *
 * One-time password (OTP) flow: a manager (admin / King / R4) issues a temp
 * password for a member. We store its hash, raise the must_change_password flag,
 * and delete that user's sessions so they must log back in with the temp one and
 * are then forced (by the root layout guard) to choose a new password.
 *
 * The plaintext temp password is returned ONCE to the issuer to relay to the
 * member out-of-band (same pattern as invite links — this app has no email).
 */

import { hashPassword } from "./auth";

// Unambiguous alphabet: no 0/O/1/I/L to avoid copy/read mistakes.
const TEMP_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Generate a short, human-relayable one-time password. */
export function generateTempPassword(length = 8): string {
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes);
	let out = "";
	for (let i = 0; i < length; i++) {
		out += TEMP_ALPHABET[bytes[i] % TEMP_ALPHABET.length];
	}
	return out;
}

/**
 * Issue a one-time password for a user: set the hash, flag must-change, and kill
 * every active session for that user. Returns the plaintext temp password so the
 * caller can show it to the issuer.
 */
export async function issueTempPassword(
	db: D1Database,
	userId: number,
): Promise<string> {
	const temp = generateTempPassword();
	const hash = await hashPassword(temp);
	const now = Math.floor(Date.now() / 1000);

	await db
		.prepare(
			"UPDATE users SET password_hash = ?, must_change_password = 1, updated_at = ? WHERE id = ?",
		)
		.bind(hash, now, userId)
		.run();
	await db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId).run();

	return temp;
}
