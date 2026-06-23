import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getDb } from "$lib/server/db";
import { calculateScores } from "$lib/server/scores";
import {
	getAllFormulas,
	getFormula,
	getDefaultParams,
	validateParams,
} from "$lib/server/formulas/registry";
import { getKvks, getActiveVersionForKvk, updateKvk } from "$lib/server/kvk";
import { t } from "$lib/i18n";

// Import all formulas (auto-register)
import "$lib/server/formulas/dkp";
import "$lib/server/formulas/ffa";
import "$lib/server/formulas/weighted-kill";
import "$lib/server/formulas/custom";

export const load: PageServerLoad = async ({ platform, parent }) => {
	const db = getDb(platform);
	const { kvk, activeVersion } = await parent();

	// Get all available formulas for selector
	const formulas = getAllFormulas().map((f) => ({
		id: f.id,
		name: f.name,
		description: f.description,
		paramCount: f.params.length,
	}));

	// Get current formula definition (strip calculate function — not serializable)
	const formulaDef = getFormula(kvk.formula_type ?? "dkp");
	const currentFormula = formulaDef
		? {
				id: formulaDef.id,
				name: formulaDef.name,
				description: formulaDef.description,
				params: formulaDef.params,
			}
		: null;

	// Parse current params
	const currentParams = kvk.formula_params
		? JSON.parse(kvk.formula_params)
		: {};

	// Build config fields with current values (merge defaults with stored params)
	const configFields =
		currentFormula?.params.map((p) => ({
			key: p.key,
			label: p.label,
			value: currentParams[p.key] ?? p.default,
			type: p.type,
			default: p.default,
			min: p.min,
			max: p.max,
			step: p.step,
			description: p.description,
		})) ?? [];

	// Also include farm_contribution_pct as a standard param
	const farmPct = currentParams.farm_contribution_pct ?? 40;
	configFields.push({
		key: "farm_contribution_pct",
		label: "Farm Contribution %",
		value: farmPct,
		type: "number",
		default: 40,
		min: 0,
		max: 100,
		step: 5,
		description: "% điểm farm chuyển cho main account",
	});

	// Load scores
	let scores: any[] = [];
	if (activeVersion) {
		const result = await db
			.prepare(
				`SELECT p.governor_name, p.governor_id, s.dkp_raw, s.dkp_combined,
				        s.rank_individual, s.rank_combined, s.farm_contribution,
				        s.dkp_base, s.bonus_pct, s.bonus_amount
				 FROM player_scores s
				 JOIN player_data p ON p.version_id = s.version_id AND p.governor_id = s.governor_id
				 WHERE s.version_id = ?
				 ORDER BY s.rank_combined ASC
				 LIMIT 100`,
			)
			.bind(activeVersion.id)
			.all();
		scores = result.results;
	}

	const allKvks = await getKvks(db);
	const otherKvks = allKvks.filter((k) => k.id !== kvk.id);

	return {
		formulas,
		currentFormulaId: kvk.formula_type ?? "dkp",
		currentFormula,
		configFields,
		scores,
		activeVersion,
		otherKvks,
	};
};

export const actions: Actions = {
	calculate: async ({ platform, params, locals }) => {
		const db = getDb(platform);
		const kvk = await db
			.prepare("SELECT id FROM kvks WHERE slug = ?")
			.bind(params.kvkSlug)
			.first<{ id: number }>();
		if (!kvk) return fail(404, { error: t(locals.lang, "err.kvkNotFound") });

		const activeVersion = await getActiveVersionForKvk(db, kvk.id);
		if (!activeVersion) return fail(400, { error: t(locals.lang, "err.noActiveVersion") });

		const count = await calculateScores(db, activeVersion.id);
		return { success: true, count };
	},

	changeFormula: async ({ request, platform, params, locals }) => {
		const db = getDb(platform);
		const kvk = await db
			.prepare("SELECT id FROM kvks WHERE slug = ?")
			.bind(params.kvkSlug)
			.first<{ id: number }>();
		if (!kvk) return fail(404, { error: t(locals.lang, "err.kvkNotFound") });

		const formData = await request.formData();
		const newFormulaId = formData.get("formulaType") as string;

		if (!newFormulaId || !getFormula(newFormulaId)) {
			return fail(400, { error: t(locals.lang, "err.invalidFormula") });
		}

		// Get default params for new formula
		const defaultParams = getDefaultParams(newFormulaId);

		// Preserve farm_contribution_pct from old params if exists
		const kvkData = await db
			.prepare("SELECT formula_params FROM kvks WHERE id = ?")
			.bind(kvk.id)
			.first<{ formula_params: string }>();

		if (kvkData?.formula_params) {
			try {
				const oldParams = JSON.parse(kvkData.formula_params);
				if (oldParams.farm_contribution_pct !== undefined) {
					defaultParams.farm_contribution_pct = oldParams.farm_contribution_pct;
				}
			} catch {
				// ignore
			}
		}

		await updateKvk(db, kvk.id, {
			formula_type: newFormulaId,
			formula_params: JSON.stringify(defaultParams),
		});

		// Recalculate
		const activeVersion = await getActiveVersionForKvk(db, kvk.id);
		let count = 0;
		if (activeVersion) {
			count = await calculateScores(db, activeVersion.id);
		}

		return { formulaChanged: true, count };
	},

	saveParam: async ({ request, platform, params, locals }) => {
		const db = getDb(platform);
		const kvk = await db
			.prepare(
				"SELECT id, formula_type, formula_params FROM kvks WHERE slug = ?",
			)
			.bind(params.kvkSlug)
			.first<{ id: number; formula_type: string; formula_params: string }>();
		if (!kvk) return fail(404, { error: t(locals.lang, "err.kvkNotFound") });

		const formData = await request.formData();
		const key = formData.get("key") as string;
		const rawValue = formData.get("value") as string;

		if (!key) return fail(400, { error: t(locals.lang, "err.missingParamKey") });

		const currentParams = kvk.formula_params
			? JSON.parse(kvk.formula_params)
			: {};

		// Update the specific param
		if (key === "farm_contribution_pct" || key === "farm_pct") {
			const numVal = parseFloat(rawValue);
			if (isNaN(numVal)) return fail(400, { error: t(locals.lang, "err.invalidValue") });
			currentParams.farm_contribution_pct = numVal;
		} else {
			const formula = getFormula(kvk.formula_type ?? "dkp");
			const paramDef = formula?.params.find((p) => p.key === key);
			if (!paramDef) return fail(400, { error: t(locals.lang, "err.invalidParam") });

			if (paramDef.type === "number") {
				const numVal = parseFloat(rawValue);
				if (isNaN(numVal)) return fail(400, { error: t(locals.lang, "err.invalidValue") });
				currentParams[key] = numVal;
			} else {
				currentParams[key] = rawValue;
			}
		}

		await updateKvk(db, kvk.id, {
			formula_params: JSON.stringify(currentParams),
		});

		// Recalculate
		const activeVersion = await getActiveVersionForKvk(db, kvk.id);
		let count = 0;
		if (activeVersion) {
			count = await calculateScores(db, activeVersion.id);
		}

		return { paramSaved: true, count };
	},

	copyFormula: async ({ request, platform, params, locals }) => {
		const db = getDb(platform);
		const kvk = await db
			.prepare("SELECT id FROM kvks WHERE slug = ?")
			.bind(params.kvkSlug)
			.first<{ id: number }>();
		if (!kvk) return fail(404, { error: t(locals.lang, "err.kvkNotFound") });

		const formData = await request.formData();
		const fromKvkId = Number(formData.get("fromKvkId"));

		if (!fromKvkId) return fail(400, { error: t(locals.lang, "err.selectSourceKvk") });

		const sourceKvk = await db
			.prepare("SELECT formula_type, formula_params FROM kvks WHERE id = ?")
			.bind(fromKvkId)
			.first<{ formula_type: string; formula_params: string }>();

		if (!sourceKvk) return fail(404, { error: t(locals.lang, "err.sourceKvkNotFound") });

		await updateKvk(db, kvk.id, {
			formula_type: sourceKvk.formula_type,
			formula_params: sourceKvk.formula_params,
		});

		// Recalculate
		const activeVersion = await getActiveVersionForKvk(db, kvk.id);
		let count = 0;
		if (activeVersion) {
			count = await calculateScores(db, activeVersion.id);
		}

		return { formulaCopied: true, count };
	},

	resetDefaults: async ({ platform, params, locals }) => {
		const db = getDb(platform);
		const kvk = await db
			.prepare("SELECT id, formula_type FROM kvks WHERE slug = ?")
			.bind(params.kvkSlug)
			.first<{ id: number; formula_type: string }>();
		if (!kvk) return fail(404, { error: t(locals.lang, "err.kvkNotFound") });

		const formulaId = kvk.formula_type ?? "dkp";
		const defaultParams = getDefaultParams(formulaId);

		await updateKvk(db, kvk.id, {
			formula_params: JSON.stringify(defaultParams),
		});

		// Recalculate
		const activeVersion = await getActiveVersionForKvk(db, kvk.id);
		let count = 0;
		if (activeVersion) {
			count = await calculateScores(db, activeVersion.id);
		}

		return { configReset: true, count };
	},
};
