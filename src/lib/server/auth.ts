import bcrypt from 'bcryptjs';

const SESSION_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds

export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

export function generateToken(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export function generateSessionId(): string {
	return generateToken();
}

export async function createSession(db: D1Database, userId: number): Promise<string> {
	const id = generateSessionId();
	const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION;
	await db
		.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
		.bind(id, userId, expiresAt)
		.run();
	return id;
}

export async function validateSession(
	db: D1Database,
	sessionId: string
): Promise<App.Locals['user']> {
	const now = Math.floor(Date.now() / 1000);
	const row = await db
		.prepare(
			`SELECT u.id, u.username, u.role, u.main_governor_id, u.must_change_password,
			        km.kingdom_id AS kingdom_id, km.role AS kingdom_role
			 FROM sessions s
			 JOIN users u ON s.user_id = u.id
			 LEFT JOIN kingdom_members km ON km.user_id = u.id AND km.status = 'active'
			 WHERE s.id = ? AND s.expires_at > ? AND u.is_active = 1`
		)
		.bind(sessionId, now)
		.first<{
			id: number;
			username: string;
			role: string;
			main_governor_id: number;
			must_change_password: number;
			kingdom_id: number | null;
			kingdom_role: string | null;
		}>();

	if (!row) return null;

	return {
		id: row.id,
		username: row.username,
		role: row.role as 'admin' | 'king' | 'player',
		mainGovernorId: row.main_governor_id,
		mustChangePassword: !!row.must_change_password,
		kingdomId: row.kingdom_id ?? null,
		kingdomRole: (row.kingdom_role as 'king' | 'r4' | 'member' | null) ?? null
	};
}

export async function deleteSession(db: D1Database, sessionId: string): Promise<void> {
	await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
}

export function sessionCookie(sessionId: string): string {
	return `session=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_DURATION}`;
}

export function clearSessionCookie(): string {
	return 'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';
}

export async function createInviteToken(
	db: D1Database,
	mainGovernorId: number,
	role: 'player' | 'king' = 'player',
	kingdomId: number | null = null,
	kingdomRole: 'king' | 'r4' | 'member' | null = null
): Promise<string> {
	const token = generateToken();
	const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days

	await db
		.prepare(
			`INSERT INTO users (main_governor_id, role, invite_token, invite_expires_at, invite_kingdom_id, invite_kingdom_role)
			 VALUES (?, ?, ?, ?, ?, ?)`
		)
		.bind(mainGovernorId, role, token, expiresAt, kingdomId, kingdomRole)
		.run();

	return token;
}
