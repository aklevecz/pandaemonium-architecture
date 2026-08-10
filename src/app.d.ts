// Subset of the Email Sending binding we actually call. The full types ship
// with the runtime via `wrangler types`; this covers send() as used by the
// magic-link flow.
interface SendEmailBinding {
	send(message: {
		to: string | string[];
		from: { email: string; name?: string } | string;
		subject: string;
		html?: string;
		text?: string;
		replyTo?: string;
		cc?: string | string[];
		bcc?: string | string[];
	}): Promise<{ messageId?: string }>;
}

declare global {
	namespace App {
		interface Locals {
			user: { id: number; email: string; isAdmin: boolean } | null;
		}
		interface Platform {
			env: {
				DB: D1Database;
				EMAIL: SendEmailBinding;
				ANTHROPIC_API_KEY: string;
				GEMINI_API_KEY: string;
				ASSETS: { fetch: (request: Request | string) => Promise<Response> };
			};
		}
	}
}

export {};
