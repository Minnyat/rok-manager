import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteSession } from '$lib/server/auth';
import { getDb } from '$lib/server/db';

export const POST: RequestHandler = async ({ cookies, platform }) => {
	const sessionId = cookies.get('session');
	if (sessionId) {
		try {
			const db = getDb(platform);
			await deleteSession(db, sessionId);
		} catch {
			// ignore
		}
	}
	cookies.delete('session', { path: '/' });
	throw redirect(303, '/login');
};
