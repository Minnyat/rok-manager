import type { PageServerLoad } from "./$types";
import { getDb } from "$lib/server/db";
import { listDonateMethods } from "$lib/server/donate";

export const load: PageServerLoad = async ({ platform }) => {
	const db = getDb(platform);
	const methods = await listDonateMethods(db, true); // active only
	return { methods };
};
