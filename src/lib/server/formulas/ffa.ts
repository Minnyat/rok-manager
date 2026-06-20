/**
 * FFA Formula — Free For All (Kill-focused).
 *
 * score = kill_points × kill_point_weight + dead × death_weight + max(0, power_diff) × power_gain_weight
 *
 * Formula này tập trung vào tổng kill points thay vì phân biệt T4/T5.
 * Phù hợp cho KVK thể thức FFA hoặc khi muốn đơn giản hóa cách tính.
 */

import { registerFormula, type Formula } from "./registry";

const ffaFormula: Formula = {
	id: "ffa",
	name: "FFA (Kill-focused)",
	description:
		"Điểm dựa trên tổng kill points, deaths, và power gain. Phù hợp cho thể thức FFA.",
	params: [
		{
			key: "kill_point_weight",
			type: "number",
			default: 1,
			label: "Kill Point Weight",
			min: 0,
			max: 100,
			step: 0.1,
			description: "Hệ số điểm cho mỗi kill point",
		},
		{
			key: "death_weight",
			type: "number",
			default: 2,
			label: "Death Weight",
			min: 0,
			max: 100,
			step: 0.1,
			description: "Hệ số điểm cho mỗi death",
		},
		{
			key: "power_gain_weight",
			type: "number",
			default: 0.5,
			label: "Power Gain Weight",
			min: 0,
			max: 100,
			step: 0.1,
			description:
				"Hệ số điểm cho mỗi power gain (chỉ tính khi power_diff > 0)",
		},
	],
	requiredColumns: ["kill_points", "dead", "power_diff"],

	calculate(playerData, params) {
		const kpw = Number(params.kill_point_weight) || 1;
		const dw = Number(params.death_weight) || 2;
		const pgw = Number(params.power_gain_weight) || 0.5;

		return playerData.map((p) => {
			const killPoints = p.kill_points ?? 0;
			const deaths = p.dead ?? 0;
			const powerDiff = p.power_diff ?? 0;

			const killScore = killPoints * kpw;
			const deathScore = deaths * dw;
			const powerGainScore = Math.max(0, powerDiff) * pgw;
			const dkp_base = killScore + deathScore + powerGainScore;

			return {
				governor_id: p.governor_id,
				dkp_base,
				breakdown: {
					kill_points: killScore,
					deaths: deathScore,
					power_gain: powerGainScore,
				},
			};
		});
	},
};

registerFormula(ffaFormula);
