const encoder = new TextEncoder();

export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
		'deriveBits'
	]);
	const derived = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
		key,
		256
	);
	const saltHex = Array.from(salt)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
	const hashHex = Array.from(new Uint8Array(derived))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
	return saltHex + ':' + hashHex;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	// Passwordless accounts store a sentinel in this column (see
	// migrations/0010). Reject anything that isn't a real '<hex>:<hex>' digest
	// rather than letting it fall through to a parse that might compare loosely.
	if (!/^[a-f0-9]+:[a-f0-9]+$/.test(stored)) return false;
	const [saltHex, hashHex] = stored.split(':');
	const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
	const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
		'deriveBits'
	]);
	const derived = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
		key,
		256
	);
	const computedHex = Array.from(new Uint8Array(derived))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
	return computedHex === hashHex;
}

export function generateSessionId(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}
