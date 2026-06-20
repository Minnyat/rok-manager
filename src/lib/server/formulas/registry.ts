/**
 * Formula Registry
 *
 * Hệ thống plugin cho scoring formulas. Mỗi KVK có thể chọn formula type riêng
 * và config tham số riêng.
 *
 * Usage:
 *   import { getFormula, getAllFormulas } from "./registry";
 *   import "./dkp";      // auto-register
 *   import "./ffa";      // auto-register
 *
 *   const formula = getFormula("dkp");
 *   const results = formula.calculate(playerData, params);
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FormulaParamDef {
	key: string;
	type: "number" | "string";
	default: number | string;
	label: string;
	min?: number;
	max?: number;
	step?: number;
	description?: string;
}

export interface FormulaResult {
	governor_id: number;
	dkp_base: number;
	breakdown: Record<string, number>; // chi tiết từng component
}

export interface Formula {
	/** Unique id, e.g. "dkp", "ffa", "weighted-kill", "custom" */
	id: string;

	/** Display name */
	name: string;

	/** Short description */
	description: string;

	/** Parameter definitions — used to render admin UI dynamically */
	params: FormulaParamDef[];

	/** Column names từ player_data mà formula này cần (ngoài governor_id) */
	requiredColumns: string[];

	/**
	 * Tính dkp_base cho tất cả players.
	 *
	 * @param playerData - Array of rows from player_data (each row is key-value)
	 * @param params - Configured params for this KVK (from kvks.formula_params JSON)
	 * @returns Array of results, one per player
	 */
	calculate(
		playerData: Record<string, number>[],
		params: Record<string, number | string>,
	): FormulaResult[];
}

// ─── Registry ────────────────────────────────────────────────────────────────

const formulas = new Map<string, Formula>();

/**
 * Register a formula. Call this at module load time (top-level import).
 */
export function registerFormula(formula: Formula): void {
	if (formulas.has(formula.id)) {
		console.warn(`[FormulaRegistry] Overwriting formula "${formula.id}"`);
	}
	formulas.set(formula.id, formula);
}

/**
 * Get a formula by id. Returns undefined if not found.
 */
export function getFormula(id: string): Formula | undefined {
	return formulas.get(id);
}

/**
 * Get all registered formulas. Used by admin UI to populate selector.
 */
export function getAllFormulas(): Formula[] {
	return Array.from(formulas.values());
}

/**
 * Get formula or throw.
 */
export function requireFormula(id: string): Formula {
	const f = formulas.get(id);
	if (!f) {
		throw new Error(
			`Unknown formula: "${id}". Available: ${[...formulas.keys()].join(", ")}`,
		);
	}
	return f;
}

/**
 * Get default params for a formula (all defaults).
 */
export function getDefaultParams(
	formulaId: string,
): Record<string, number | string> {
	const formula = formulas.get(formulaId);
	if (!formula) return {};
	const params: Record<string, number | string> = {};
	for (const p of formula.params) {
		params[p.key] = p.default;
	}
	return params;
}

/**
 * Validate and fill defaults for params.
 * Returns cleaned params with defaults applied for missing keys.
 */
export function validateParams(
	formulaId: string,
	rawParams: Record<string, unknown>,
): Record<string, number | string> {
	const formula = requireFormula(formulaId);
	const result: Record<string, number | string> = {};

	for (const def of formula.params) {
		const raw = rawParams[def.key];

		if (raw === undefined || raw === null || raw === "") {
			result[def.key] = def.default;
			continue;
		}

		if (def.type === "number") {
			let num = Number(raw);
			if (isNaN(num)) num = def.default as number;
			if (def.min !== undefined && num < def.min) num = def.min;
			if (def.max !== undefined && num > def.max) num = def.max;
			result[def.key] = num;
		} else {
			result[def.key] = String(raw);
		}
	}

	return result;
}
