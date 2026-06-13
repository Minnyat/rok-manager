import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { lang } = (await request.json()) as { lang: string };
	cookies.set('lang', lang === 'en' ? 'en' : 'vi', {
		path: '/',
		httpOnly: false,
		maxAge: 60 * 60 * 24 * 365
	});
	return json({ lang });
};
