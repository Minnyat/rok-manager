export function formatNumber(n: number | null | undefined): string {
	if (n === null || n === undefined) return '-';
	if (Math.abs(n) >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
	if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
	if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'K';
	return n.toLocaleString();
}

export function formatPower(n: number): string {
	return (n / 1_000_000).toFixed(1) + 'M';
}

export function formatDate(unixSeconds: number): string {
	return new Date(unixSeconds * 1000).toLocaleDateString('vi-VN', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}
