import type { D1Database } from "@cloudflare/workers-types";

export interface DonateMethod {
	id: number;
	name: string;
	type: "bank" | "ewallet" | "paypal" | "crypto" | "other";
	account_number: string | null;
	account_name: string | null;
	bank_name: string | null;
	description: string | null;
	qr_data: string | null;
	payment_link: string | null;
	display_order: number;
	is_active: number;
	created_at: string;
	updated_at: string;
}

export async function listDonateMethods(
	db: D1Database,
	activeOnly = false,
): Promise<DonateMethod[]> {
	const sql = activeOnly
		? "SELECT * FROM donate_methods WHERE is_active = 1 ORDER BY display_order ASC, id ASC"
		: "SELECT * FROM donate_methods ORDER BY display_order ASC, id ASC";
	const result = await db.prepare(sql).all<DonateMethod>();
	return result.results;
}

export async function getDonateMethod(
	db: D1Database,
	id: number,
): Promise<DonateMethod | null> {
	return db
		.prepare("SELECT * FROM donate_methods WHERE id = ?")
		.bind(id)
		.first<DonateMethod>();
}

export async function createDonateMethod(
	db: D1Database,
	data: {
		name: string;
		type: string;
		account_number: string;
		account_name: string;
		bank_name: string;
		description: string;
		qr_data: string;
		payment_link: string;
		display_order: number;
		is_active: number;
	},
) {
	return db
		.prepare(
			`INSERT INTO donate_methods
        (name, type, account_number, account_name, bank_name, description, qr_data, payment_link, display_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			data.name,
			data.type,
			data.account_number || null,
			data.account_name || null,
			data.bank_name || null,
			data.description || null,
			data.qr_data || null,
			data.payment_link || null,
			data.display_order,
			data.is_active,
		)
		.run();
}

export async function updateDonateMethod(
	db: D1Database,
	id: number,
	data: {
		name: string;
		type: string;
		account_number: string;
		account_name: string;
		bank_name: string;
		description: string;
		qr_data: string | null;
		payment_link: string | null;
		display_order: number;
		is_active: number;
	},
) {
	return db
		.prepare(
			`UPDATE donate_methods
       SET name = ?, type = ?, account_number = ?, account_name = ?,
           bank_name = ?, description = ?, qr_data = ?, payment_link = ?,
           display_order = ?, is_active = ?, updated_at = datetime('now')
       WHERE id = ?`,
		)
		.bind(
			data.name,
			data.type,
			data.account_number || null,
			data.account_name || null,
			data.bank_name || null,
			data.description || null,
			data.qr_data || null,
			data.payment_link || null,
			data.display_order,
			data.is_active,
			id,
		)
		.run();
}

export async function deleteDonateMethod(db: D1Database, id: number) {
	return db.prepare("DELETE FROM donate_methods WHERE id = ?").bind(id).run();
}
