import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getDb } from "$lib/server/db";
import { t } from "$lib/i18n";
import { isAdmin } from "$lib/server/permissions";
import {
	listDonateMethods,
	getDonateMethod,
	createDonateMethod,
	updateDonateMethod,
	deleteDonateMethod,
} from "$lib/server/donate";

export const load: PageServerLoad = async ({ platform, locals }) => {
	if (!isAdmin(locals.user)) throw redirect(303, '/dashboard');

	const db = getDb(platform);
	const methods = await listDonateMethods(db);
	return { methods };
};

function extractFields(form: FormData) {
	return {
		name: (form.get("name") as string)?.trim() ?? "",
		type: (form.get("type") as string) || "bank",
		account_number: (form.get("account_number") as string) || "",
		account_name: (form.get("account_name") as string) || "",
		bank_name: (form.get("bank_name") as string) || "",
		description: (form.get("description") as string) || "",
		qr_data: (form.get("qr_data") as string)?.trim() || "",
		payment_link: (form.get("payment_link") as string)?.trim() || "",
		display_order: Number(form.get("display_order") || 0),
		is_active: form.get("is_active") === "1" ? 1 : 0,
	};
}

export const actions: Actions = {
	create: async ({ request, platform, locals }) => {
		if (!isAdmin(locals.user)) return fail(403, { error: t(locals.lang, "err.noPermission") });

		const form = await request.formData();
		const fields = extractFields(form);
		if (!fields.name) return fail(400, { error: t(locals.lang, "err.donateNameRequired") });

		const db = getDb(platform);
		await createDonateMethod(db, fields);
		return { saved: true };
	},

	update: async ({ request, platform, locals }) => {
		if (!isAdmin(locals.user)) return fail(403, { error: t(locals.lang, "err.noPermission") });

		const form = await request.formData();
		const id = Number(form.get("id"));
		if (!id) return fail(400, { error: t(locals.lang, "err.donateMethodNotFound") });

		const fields = extractFields(form);
		if (!fields.name) return fail(400, { error: t(locals.lang, "err.donateNameRequired") });

		const db = getDb(platform);
		const existing = await getDonateMethod(db, id);
		if (!existing) return fail(404, { error: t(locals.lang, "err.donateMethodNotFound") });

		await updateDonateMethod(db, id, fields);
		return { saved: true };
	},

	delete: async ({ request, platform, locals }) => {
		if (!isAdmin(locals.user)) return fail(403, { error: t(locals.lang, "err.noPermission") });

		const form = await request.formData();
		const id = Number(form.get("id"));
		if (!id) return fail(400, { error: t(locals.lang, "err.donateMethodNotFound") });

		const db = getDb(platform);
		await deleteDonateMethod(db, id);
		return { deleted: true };
	},
};
