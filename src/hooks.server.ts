import type { Handle } from '@sveltejs/kit';
import { validateSession } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { getLang } from '$lib/i18n';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;
	event.locals.lang = getLang(event.cookies.get('lang'));

	const sessionId = event.cookies.get('session');
	if (sessionId) {
		try {
			const db = getDb(event.platform);
			event.locals.user = await validateSession(db, sessionId);
		} catch {
			// DB not available or invalid session
		}
	}

	return resolve(event);
};
