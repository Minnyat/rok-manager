/**
 * Weighted Kill Formula — Kill-weighted DKP với efficiency bonus.
 *
 * base = t4 × t4_weight + t5 × t5_weight
 * efficiency = (t4 + t5) >= min_kills_threshold ? base × kill_efficiency_bonus / 100 : 0
 * dkp_base = base + efficiency
 *
 * Formula này thưởng thêm cho những người đạt ngưỡng kill nhất định.
 * Khuyến khích participation cao.
 */

import { registerFormula, type Formula } from "./registry";

const weightedKillFormula: Formula = {
	id: "weighted-kill",
	name: "Weighted Kill (Efficiency Bonus)",
	description:
		"Điểm dựa trên T4/T5 kills với bonus cho người đạt ngưỡng kill cao. Khuyến khích participation.",
	params: [
		{
			key: "t4_weight",
			type: "number",
			default: 1,
			label: "T4 Weight",
			min: 0,
			max: 100,
			step: 0.1,
			description: "Hệ số điểm cho mỗi T4 kill",
		},
		{
			key: "t5_weight",
			type: "number",
			default: 5,
			label: "T5 Weight",
			min: 0,
			max: 100,
			step: 0.1,
			description: "Hệ số điểm cho mỗi T5 kill",
		},
		{
			key: "kill_efficiency_bonus",
			type: "number",
			default: 10,
			label: "Kill Efficiency Bonus %",
			min: 0,
			max: 200,
			step: 1,
			description: "Phần trăm bonus thêm khi đạt ngưỡng kill",
		},
		{
			key: "min_kills_threshold",
			type: "number",
			default: 100000,
			label: "Min Kills Threshold",
			min: 0,
			max: 100000000,
			step: 10000,
			description: "Ngưỡng kill tối thiểu để nhận bonus",
		},
	],
	requiredColumns: ["t4", "t5"],

	calculate(playerData, params) {
		const t4w = Number(params.t4_weight) || 1;
		const t5w = Number(params.t5_weight) || 5;
		const bonusPct = (Number(params.kill_efficiency_bonus) || 10) / 100;
		const threshold = Number(params.min_kills_threshold) || 100000;

		return playerData.map((p) => {
			const t4 = p.t4 ?? 0;
			const t5 = p.t5 ?? 0;

			const t4Score = t4 * t4w;
			const t5Score = t5 * t5w;
			const base = t4Score + t5Score;

			const totalKills = t4 + t5;
			const efficiencyBonus = totalKills >= threshold ? base * bonusPct : 0;
			const dkp_base = base + efficiencyBonus;

			return {
				governor_id: p.governor_id,
				dkp_base,
				breakdown: {
					t4_kill: t4Score,
					t5_kill: t5Score,
					efficiency_bonus: efficiencyBonus,
					total_kills: totalKills,
					threshold_met: totalKills >= threshold ? 1 : 0,
				},
			};
		});
	},
};

registerFormula(weightedKillFormula);
