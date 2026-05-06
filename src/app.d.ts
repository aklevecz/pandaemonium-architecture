declare global {
	namespace App {
		interface Locals {
			user: { id: number; email: string } | null;
		}
		interface Platform {
			env: {
				DB: D1Database;
				ANTHROPIC_API_KEY: string;
				GEMINI_API_KEY: string;
			};
		}
	}
}

export {};
