declare global {
	namespace App {
		interface Locals {
			user: { id: number; email: string } | null;
		}
		interface Platform {
			env: {
				DB: D1Database;
			};
		}
	}
}

export {};
