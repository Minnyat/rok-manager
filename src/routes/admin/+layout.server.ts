import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login');
	if (!['admin', 'king'].includes(locals.user.role)) throw redirect(303, '/dashboard');
};
