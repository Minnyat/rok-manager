export function getDb(platform: App.Platform | undefined): D1Database {
	if (!platform?.env?.DB) {
		throw new Error('D1 database not available');
	}
	return platform.env.DB;
}
