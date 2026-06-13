declare global {
	namespace App {
		interface Locals {
			user: {
				id: number;
				username: string;
				role: 'admin' | 'king' | 'player';
				mainGovernorId: number;
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
