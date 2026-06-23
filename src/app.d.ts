declare global {
	namespace App {
		interface Locals {
			user: {
				id: number;
				username: string;
				role: 'admin' | 'king' | 'player';
				mainGovernorId: number;
				/** True when a one-time password was issued; forces a password change. */
				mustChangePassword: boolean;
				/** The user's current (active) kingdom, or null (e.g. admins). */
				kingdomId: number | null;
				/** Kingdom-scoped role from the active membership, or null. */
				kingdomRole: 'king' | 'r4' | 'member' | null;
			} | null;
			lang: import('$lib/i18n').Lang;
		}

		interface Platform {
			env: {
				DB: D1Database;
			};
		}
	}
}

export {};
