/**
 * DKP Formula — công thức tính điểm mặc định (hiện tại).
 *
 * dkp_base = t4×t4_kill_weight + t5×t5_kill_weight + dead_t4×dead_t4_weight + dead_t5×dead_t5_weight
 *
 * Đây là formula hiện tại của hệ thống, được extract từ scoring-config.ts.
 */

import { registerFormula, type Formula } from "./registry";

const dkpFormula: Formula = {
	id: "dkp",
	name: "DKP (Default)",
	description:
		"Điểm DKP dựa trên T4/T5 kills và deaths. Công thức mặc định của hệ thống.",
	params: [
		{
			key: "t4_kill_weight",
			type: "number",
			default: 1,
			label: "T4 Kill Weight",
			min: 0,
			max: 100,
			step: 0.1,
			description: "Hệ số điểm cho mỗi T4 kill",
		},
		{
			key: "t5_kill_weight",
			type: "number",
			default: 3,
			label: "T5 Kill Weight",
			min: 0,
			max: 100,
			step: 0.1,
			description: "Hệ số điểm cho mỗi T5 kill",
		},
		{
			key: "dead_t4_weight",
			type: "number",
			default: 2,
			label: "Dead T4 Weight",
			min: 0,
			max: 100,
			step: 0.1,
			description: "Hệ số điểm cho mỗi T4 death",
		},
		{
			key: "dead_t5_weight",
			type: "number",
			default: 4,
			label: "Dead T5 Weight",
			min: 0,
			max: 100,
			step: 0.1,
			description: "Hệ số điểm cho mỗi T5 death",
		},
	],
	requiredColumns: ["t4", "t5", "dead_t4", "dead_t5"],

	calculate(playerData, params) {
		const t4w = Number(params.t4_kill_weight) || 1;
		const t5w = Number(params.t5_kill_weight) || 3;
		const d4w = Number(params.dead_t4_weight) || 2;
		const d5w = Number(params.dead_t5_weight) || 4;

		return playerData.map((p) => {
			const t4 = p.t4 ?? 0;
			const t5 = p.t5 ?? 0;
			const dead_t4 = p.dead_t4 ?? 0;
			const dead_t5 = p.dead_t5 ?? 0;

			const t4Score = t4 * t4w;
			const t5Score = t5 * t5w;
			const deadT4Score = dead_t4 * d4w;
			const deadT5Score = dead_t5 * d5w;
			const dkp_base = t4Score + t5Score + deadT4Score + deadT5Score;

			return {
				governor_id: p.governor_id,
				dkp_base,
				breakdown: {
					t4_kill: t4Score,
					t5_kill: t5Score,
					dead_t4: deadT4Score,
					dead_t5: deadT5Score,
				},
			};
		});
	},
};

registerFormula(dkpFormula);
