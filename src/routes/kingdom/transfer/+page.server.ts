import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

// Kingdom transfer now lives in the account settings hub (/settings#transfer).
// Keep this route as a redirect so old links/bookmarks still work.
export const load: PageServerLoad = () => {
	throw redirect(307, "/settings#transfer");
};
