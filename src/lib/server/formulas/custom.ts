/**
 * Custom Expression Formula — cho phép admin nhập biểu thức tùy chỉnh.
 *
 * Admin nhập expression dạng: "t4*1 + t5*3 + dead_t4*2 + dead_t5*4"
 *
 * Available variables (từ player_data):
 *   t4, t5, dead_t4, dead_t5, dead, kp, kill_points, power, power_diff,
 *   dead_t1, dead_t2, dead_t3, healed, acclaim, death_points, heal_points, feeding_rate
 *
 * Supported operators: +, -, *, /, ()
 * Supported functions: max(a,b), min(a,b), abs(x), sqrt(x), pow(x,y)
 *
 * Security: Không dùng eval(). Dùng recursive descent parser.
 */

import { registerFormula, type Formula, type FormulaResult } from "./registry";

// ─── Available variables ─────────────────────────────────────────────────────

const ALLOWED_VARS = new Set([
	"t4",
	"t5",
	"dead_t4",
	"dead_t5",
	"dead",
	"dead_t1",
	"dead_t2",
	"dead_t3",
	"kp",
	"kill_points",
	"power",
	"power_diff",
	"healed",
	"acclaim",
	"death_points",
	"heal_points",
	"feeding_rate",
	"dkp",
	"trades",
	"credit_score",
]);

// ─── Safe Expression Evaluator ───────────────────────────────────────────────

type VarMap = Record<string, number>;

function tokenize(expr: string): string[] {
	const tokens: string[] = [];
	let i = 0;
	while (i < expr.length) {
		const ch = expr[i];
		if (/\s/.test(ch)) {
			i++;
			continue;
		}
		if ("+-*/(),".includes(ch)) {
			tokens.push(ch);
			i++;
			continue;
		}
		if (/[0-9.]/.test(ch)) {
			let num = "";
			while (i < expr.length && /[0-9.]/.test(expr[i])) {
				num += expr[i++];
			}
			tokens.push(num);
			continue;
		}
		if (/[a-z_]/i.test(ch)) {
			let ident = "";
			while (i < expr.length && /[a-z_0-9]/i.test(expr[i])) {
				ident += expr[i++];
			}
			tokens.push(ident);
			continue;
		}
		throw new Error(`Unexpected character: "${ch}" at position ${i}`);
	}
	return tokens;
}

class Parser {
	private tokens: string[];
	private pos = 0;

	constructor(tokens: string[]) {
		this.tokens = tokens;
	}

	private peek(): string | undefined {
		return this.tokens[this.pos];
	}

	private consume(expected?: string): string {
		const tok = this.tokens[this.pos++];
		if (expected && tok !== expected) {
			throw new Error(`Expected "${expected}" but got "${tok}"`);
		}
		return tok ?? "";
	}

	parse(): number {
		const result = this.parseExpr();
		if (this.pos < this.tokens.length) {
			throw new Error(
				`Unexpected token: "${this.tokens[this.pos]}" at position ${this.pos}`,
			);
		}
		return result;
	}

	private parseExpr(): number {
		let left = this.parseTerm();
		while (this.peek() === "+" || this.peek() === "-") {
			const op = this.consume();
			const right = this.parseTerm();
			left = op === "+" ? left + right : left - right;
		}
		return left;
	}

	private parseTerm(): number {
		let left = this.parseUnary();
		while (this.peek() === "*" || this.peek() === "/") {
			const op = this.consume();
			const right = this.parseUnary();
			left = op === "*" ? left * right : left / right;
		}
		return left;
	}

	private parseUnary(): number {
		if (this.peek() === "-") {
			this.consume();
			return -this.parsePrimary();
		}
		if (this.peek() === "+") {
			this.consume();
		}
		return this.parsePrimary();
	}

	private parsePrimary(): number {
		const tok = this.peek();
		if (!tok) throw new Error("Unexpected end of expression");

		// Number
		if (/^[0-9.]/.test(tok)) {
			this.consume();
			return parseFloat(tok);
		}

		// Parenthesized expression
		if (tok === "(") {
			this.consume("(");
			const val = this.parseExpr();
			this.consume(")");
			return val;
		}

		// Function call or variable
		if (/^[a-z_]/i.test(tok)) {
			this.consume();
			if (this.peek() === "(") {
				// Function call
				return this.parseFunction(tok);
			}
			// Variable
			if (!ALLOWED_VARS.has(tok)) {
				throw new Error(`Unknown variable: "${tok}"`);
			}
			return this.vars[tok] ?? 0;
		}

		throw new Error(`Unexpected token: "${tok}"`);
	}

	private vars: VarMap = {};

	setVars(vars: VarMap) {
		this.vars = vars;
	}

	private parseFunction(name: string): number {
		const funcs: Record<string, (...args: number[]) => number> = {
			max: Math.max,
			min: Math.min,
			abs: (x: number) => Math.abs(x),
			sqrt: (x: number) => Math.sqrt(x),
			pow: (x: number, y: number) => x ** y,
		};

		const fn = funcs[name];
		if (!fn) throw new Error(`Unknown function: "${name}"`);

		this.consume("(");
		const args: number[] = [];
		if (this.peek() !== ")") {
			args.push(this.parseExpr());
			while (this.peek() === ",") {
				this.consume(",");
				args.push(this.parseExpr());
			}
		}
		this.consume(")");

		return fn(...args);
	}
}

/**
 * Evaluate expression safely with given variables.
 */
function evaluateExpression(expr: string, vars: VarMap): number {
	const tokens = tokenize(expr);
	const parser = new Parser(tokens);
	parser.setVars(vars);
	return parser.parse();
}

// ─── Formula Definition ──────────────────────────────────────────────────────

const customFormula: Formula = {
	id: "custom",
	name: "Custom Expression",
	description:
		"Nhập biểu thức tùy chỉnh. Ví dụ: t4*1 + t5*3 + dead_t4*2 + dead_t5*4. Hỗ trợ +, -, *, /, (), max(), min(), abs(), sqrt(), pow().",
	params: [
		{
			key: "expression",
			type: "string",
			default: "t4*1 + t5*3 + dead_t4*2 + dead_t5*4",
			label: "Formula Expression",
			description:
				"Biểu thức tính điểm. Variables: t4, t5, dead_t4, dead_t5, dead, kill_points, power, power_diff, ...",
		},
	],
	requiredColumns: [
		"t4",
		"t5",
		"dead_t4",
		"dead_t5",
		"dead",
		"kill_points",
		"power",
		"power_diff",
		"kp",
		"healed",
	],

	calculate(playerData, params) {
		const expression = String(
			params.expression || "t4*1 + t5*3 + dead_t4*2 + dead_t5*4",
		);

		return playerData.map((p): FormulaResult => {
			const vars: VarMap = {};
			for (const key of ALLOWED_VARS) {
				vars[key] = p[key] ?? 0;
			}

			let dkp_base: number;
			try {
				dkp_base = evaluateExpression(expression, vars);
			} catch {
				dkp_base = 0;
			}

			// Breakdown: show all variable values used
			const breakdown: Record<string, number> = {};
			for (const key of ALLOWED_VARS) {
				if (p[key] !== undefined && p[key] !== 0) {
					breakdown[key] = p[key];
				}
			}
			breakdown._result = dkp_base;

			return {
				governor_id: p.governor_id,
				dkp_base,
				breakdown,
			};
		});
	},
};

registerFormula(customFormula);
