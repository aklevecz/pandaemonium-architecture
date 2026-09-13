import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

/** Model output is untrusted, including every partial streaming response. */
export function renderChatMarkdown(content: string): string {
	return sanitizeHtml(marked.parse(content, { async: false }), {
		allowedTags: [
			'p',
			'br',
			'strong',
			'em',
			'del',
			'blockquote',
			'ul',
			'ol',
			'li',
			'pre',
			'code',
			'h1',
			'h2',
			'h3',
			'h4',
			'h5',
			'h6',
			'hr',
			'a',
			'table',
			'thead',
			'tbody',
			'tr',
			'th',
			'td',
			'sup',
			'sub'
		],
		allowedAttributes: { a: ['href', 'title'], ol: ['start'] },
		allowedSchemes: ['https', 'http', 'mailto'],
		allowProtocolRelative: false,
		parseStyleAttributes: false
	});
}
