import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login');

	const isSystemAdmin = locals.user.role === 'admin';
	const isManager =
		isSystemAdmin ||
		locals.user.kingdomRole === 'king' ||
		locals.user.kingdomRole === 'r4';
	if (!isManager) throw redirect(303, '/dashboard');

	return {
		isSystemAdmin,
		// The kingdom a King/R4 manages (null for the system admin, who works
		// across kingdoms via /admin/kingdoms).
		manageKingdomId: isSystemAdmin ? null : locals.user.kingdomId,
		kingdomRole: locals.user.kingdomRole
	};
};
