import Papa from 'papaparse';

export interface PlayerRow {
	ranking: number;
	governorId: number;
	governorName: string;
	camp: string;
	kd: number;
	power: number;
	powerDiff: number;
	kp: number;
	t4: number;
	t5: number;
	dead: number;
	acclaim: number;
	healed: number;
	deadT1: number;
	deadT2: number;
	deadT3: number;
	deadT4: number;
	deadT5: number;
	dkp: number;
	trades: number | null;
	creditScore: number | null;
	killPoints: number;
	deathPoints: number;
	healPoints: number;
	feedingRate: number | null;
}

function parseNum(val: unknown): number {
	if (val === null || val === undefined || val === '') return 0;
	const n = Number(String(val).replace(/,/g, ''));
	return isNaN(n) ? 0 : n;
}

function parseNumOrNull(val: unknown): number | null {
	if (val === null || val === undefined || val === '') return null;
	const n = Number(String(val).replace(/,/g, ''));
	return isNaN(n) ? null : n;
}

const REQUIRED_COLUMNS = ['Governor ID', 'Governor Name'];

const IMPORTANT_COLUMNS = ['T4', 'T5', 'Dead T4', 'Dead T5', 'Power', 'Dead'];

const OPTIONAL_COLUMNS = [
	'#', 'Camp', 'KD', 'Power Diff', 'KP', 'Acclaim', 'Healed',
	'Dead T1', 'Dead T2', 'Dead T3', 'DKP', 'Trades', 'Credit Score',
	'Kill Points', 'Death Points', 'Heal Points', 'Feeding Rate'
];

export function parseCSV(csvText: string): { rows: PlayerRow[]; errors: string[]; warnings: string[] } {
	const errors: string[] = [];
	const warnings: string[] = [];

	const result = Papa.parse(csvText, {
		header: true,
		skipEmptyLines: true,
		transformHeader: (h: string) => h.trim()
	});

	if (result.errors.length > 0) {
		errors.push(...result.errors.map((e: { row?: number; message: string }) => `Row ${e.row}: ${e.message}`));
	}

	const headers = result.meta.fields || [];

	for (const col of REQUIRED_COLUMNS) {
		if (!headers.includes(col)) {
			errors.push(`Thiếu cột bắt buộc: ${col}`);
		}
	}

	if (REQUIRED_COLUMNS.some((c) => !headers.includes(c))) {
		return { rows: [], errors, warnings };
	}

	for (const col of IMPORTANT_COLUMNS) {
		if (!headers.includes(col)) {
			warnings.push(`Thiếu cột quan trọng cho DKP: "${col}" — giá trị sẽ mặc định = 0`);
		}
	}

	for (const col of OPTIONAL_COLUMNS) {
		if (!headers.includes(col)) {
			warnings.push(`Thiếu cột: "${col}" — bỏ qua`);
		}
	}

	const has = (col: string) => headers.includes(col);

	const rows: PlayerRow[] = [];
	for (const raw of result.data as Record<string, unknown>[]) {
		const govId = parseNum(raw['Governor ID']);
		if (!govId) continue;

		rows.push({
			ranking: has('#') ? parseNum(raw['#']) : 0,
			governorId: govId,
			governorName: String(raw['Governor Name'] || '').trim(),
			camp: has('Camp') ? String(raw['Camp'] || '').trim() : '',
			kd: has('KD') ? parseNum(raw['KD']) : 0,
			power: has('Power') ? parseNum(raw['Power']) : 0,
			powerDiff: has('Power Diff') ? parseNum(raw['Power Diff']) : 0,
			kp: has('KP') ? parseNum(raw['KP']) : 0,
			t4: has('T4') ? parseNum(raw['T4']) : 0,
			t5: has('T5') ? parseNum(raw['T5']) : 0,
			dead: has('Dead') ? parseNum(raw['Dead']) : 0,
			acclaim: has('Acclaim') ? parseNum(raw['Acclaim']) : 0,
			healed: has('Healed') ? parseNum(raw['Healed']) : 0,
			deadT1: has('Dead T1') ? parseNum(raw['Dead T1']) : 0,
			deadT2: has('Dead T2') ? parseNum(raw['Dead T2']) : 0,
			deadT3: has('Dead T3') ? parseNum(raw['Dead T3']) : 0,
			deadT4: has('Dead T4') ? parseNum(raw['Dead T4']) : 0,
			deadT5: has('Dead T5') ? parseNum(raw['Dead T5']) : 0,
			dkp: has('DKP') ? parseNum(raw['DKP']) : 0,
			trades: has('Trades') ? parseNumOrNull(raw['Trades']) : null,
			creditScore: has('Credit Score') ? parseNumOrNull(raw['Credit Score']) : null,
			killPoints: has('Kill Points') ? parseNum(raw['Kill Points']) : 0,
			deathPoints: has('Death Points') ? parseNum(raw['Death Points']) : 0,
			healPoints: has('Heal Points') ? parseNum(raw['Heal Points']) : 0,
			feedingRate: has('Feeding Rate') ? parseNumOrNull(raw['Feeding Rate']) : null
		});
	}

	return { rows, errors, warnings };
}

export async function insertPlayerData(
	db: D1Database,
	versionId: number,
	rows: PlayerRow[]
): Promise<void> {
	const BATCH_SIZE = 40;
	for (let i = 0; i < rows.length; i += BATCH_SIZE) {
		const batch = rows.slice(i, i + BATCH_SIZE);
		const stmts = batch.map((r) =>
			db
				.prepare(
					`INSERT INTO player_data (version_id, ranking, governor_id, governor_name, camp, kd,
					 power, power_diff, kp, t4, t5, dead, acclaim, healed,
					 dead_t1, dead_t2, dead_t3, dead_t4, dead_t5, dkp,
					 trades, credit_score, kill_points, death_points, heal_points, feeding_rate)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
				)
				.bind(
					versionId, r.ranking, r.governorId, r.governorName, r.camp, r.kd,
					r.power, r.powerDiff, r.kp, r.t4, r.t5, r.dead, r.acclaim, r.healed,
					r.deadT1, r.deadT2, r.deadT3, r.deadT4, r.deadT5, r.dkp,
					r.trades, r.creditScore, r.killPoints, r.deathPoints, r.healPoints, r.feedingRate
				)
		);
		await db.batch(stmts);
	}
}
