// Model size and training compute, from Stable Diffusion 1.5 to the 2026
// frontier, for the /scale chart. Almost nothing here is stated by the people
// who trained the model: closed labs stopped publishing parameter counts and
// compute around GPT-4. `basis` says where each number came from, and the
// chart draws the three kinds differently so an estimate never passes for a
// measurement.
//
// Sources, checked 2026-09-20:
//   Stable Diffusion v1 model card (150,000 A100-hours, 32 x 8 A100s)
//     https://huggingface.co/CompVis/stable-diffusion-v1-4
//   Epoch AI, Data on AI Models (parameters, training compute, confidence)
//     https://epoch.ai/data/ai-models
//   Epoch AI, What did it take to train Grok 4? (energy, cost)
//     https://epoch.ai/data-insights/grok-4-training-resources

export type Basis = 'stated' | 'estimate' | 'projection';

export interface Measure {
	value: number;
	basis: Basis;
	/** For a projection: the span the point estimate sits inside. */
	range?: [number, number];
	note: string;
}

export interface ScaleModel {
	name: string;
	developer: string;
	/** Shown as written; rows are already in date order. */
	date: string;
	modality: string;
	/** Absent when nobody outside the lab has a defensible number. */
	params?: Measure;
	compute: Measure;
	/** GB of fast memory to hold one copy, at the precision it is served in. */
	memory: Measure;
	/** Purchase price, in dollars, of the smallest machine that holds one copy. */
	hardware: Measure;
	/** What a user pays, in dollars, for one response. */
	response: Measure;
	aside?: string;
}

// How the three running-cost columns were worked out. These are our own
// estimates, made in September 2026; none of them is a published figure.
export const RUNNING_COST_METHOD = [
	'Memory: parameters times bytes per parameter (2 for Stable Diffusion at 16-bit, 1 for the large models at 8-bit, half for Kimi K3, which ships at 4-bit), plus 20% for working memory.',
	'Hardware: the smallest set of machines of that year whose memory holds one copy, at purchase price. A provider buys many times this to serve real traffic.',
	'One response: list price at launch. For Stable Diffusion, one 512-pixel image from a hosted API. For the language models, a 500-token question and a 500-token answer; for the reasoning models (Grok 4, Kimi K3, the 2026 frontier) the answer includes 2,000 to 3,000 tokens of reasoning, which are billed as output.'
];

export const SOURCES = [
	{
		label: 'Stable Diffusion v1 model card',
		href: 'https://huggingface.co/CompVis/stable-diffusion-v1-4'
	},
	{ label: 'Epoch AI, Data on AI Models', href: 'https://epoch.ai/data/ai-models' },
	{
		label: 'Epoch AI, What did it take to train Grok 4?',
		href: 'https://epoch.ai/data-insights/grok-4-training-resources'
	},
	{
		label: 'IntuitionLabs, Data Center GPU Pricing 2026',
		href: 'https://intuitionlabs.ai/articles/data-center-gpu-pricing-2026'
	},
	{ label: 'BenchLM, LLM API pricing', href: 'https://benchlm.ai/llm-pricing' }
];

export const models: ScaleModel[] = [
	{
		name: 'Stable Diffusion 1.5',
		developer: 'CompVis, Stability AI, Runway',
		date: 'Oct 2022',
		modality: 'text to image',
		params: { value: 1.07e9, basis: 'stated', note: '860M U-Net, 123M text encoder, 84M autoencoder.' },
		compute: {
			value: 5e22,
			basis: 'estimate',
			note: 'From the model card: 150,000 A100-hours on 256 GPUs, at 30% utilization.'
		},
		memory: { value: 4, basis: 'estimate', note: 'About 2 GB of weights at 16-bit, 4 GB with working memory.' },
		hardware: { value: 1500, basis: 'estimate', note: 'A laptop with an 8 GB graphics card.' },
		response: {
			value: 0.002,
			basis: 'estimate',
			note: 'One image from a hosted API. On your own laptop it is about 0.1 Wh of electricity, a few thousandths of a cent.'
		},
		aside: 'Runs on a laptop. The whole model is a 4 GB file.'
	},
	{
		name: 'GPT-4',
		developer: 'OpenAI',
		date: 'Mar 2023',
		modality: 'text and images in, text out',
		params: {
			value: 1.8e12,
			basis: 'estimate',
			note: 'Widely reported, never confirmed. A mixture of experts, so only part runs per token.'
		},
		compute: { value: 2.1e25, basis: 'estimate', note: 'Epoch AI estimate, rated likely.' },
		memory: { value: 2200, basis: 'estimate', note: '1.8T parameters at 8-bit, plus working memory.' },
		hardware: {
			value: 8e5,
			basis: 'estimate',
			note: 'Four 8-GPU A100 servers at 2023 prices. Reports put real deployments at 128 GPUs per copy.'
		},
		response: { value: 0.045, basis: 'estimate', note: 'Launch price: $30 per million tokens in, $60 out.' }
	},
	{
		name: 'Gemini 1.0 Ultra',
		developer: 'Google DeepMind',
		date: 'Dec 2023',
		modality: 'text, images, audio, video',
		params: {
			value: 1e12,
			basis: 'estimate',
			note: 'Google never said, and nobody has published an estimate. This one is ours, sized from its training compute.'
		},
		compute: { value: 5e25, basis: 'estimate', note: 'Epoch AI estimate, rated speculative.' },
		memory: {
			value: 1200,
			basis: 'estimate',
			note: 'From our 1T parameter guess. Google serves it on its own TPU chips.'
		},
		hardware: {
			value: 6e5,
			basis: 'estimate',
			note: 'The GPU equivalent: two 8-GPU H100 servers. Google does not sell its TPUs.'
		},
		response: {
			value: 0.02,
			basis: 'estimate',
			note: 'Never sold by the token at launch. Priced here like GPT-4 Turbo, its direct competitor.'
		}
	},
	{
		name: 'Llama 3.1 405B',
		developer: 'Meta',
		date: 'Jul 2024',
		modality: 'text only',
		params: { value: 4.05e11, basis: 'stated', note: 'Open weights, dense.' },
		compute: {
			value: 3.8e25,
			basis: 'stated',
			note: 'Meta published it. The one frontier-scale run here with numbers from the source.'
		},
		memory: {
			value: 490,
			basis: 'estimate',
			note: "Meta's 8-bit release is built to fit one 8-GPU H100 server (640 GB)."
		},
		hardware: { value: 3.5e5, basis: 'estimate', note: 'One 8-GPU H100 server.' },
		response: {
			value: 0.0035,
			basis: 'estimate',
			note: 'About $3.50 per million tokens at hosting companies, in or out.'
		},
		aside: 'Text only. Kept as the anchor, since its numbers are not guesses.'
	},
	{
		name: 'Grok 3',
		developer: 'xAI',
		date: 'Feb 2025',
		modality: 'text and images',
		params: { value: 3e12, basis: 'estimate', note: 'Epoch AI estimate.' },
		compute: {
			value: 3.5e26,
			basis: 'estimate',
			note: 'Epoch AI estimate, rated likely. The first run past 10²⁶.'
		},
		memory: { value: 3600, basis: 'estimate', note: '3T parameters at 8-bit, plus working memory.' },
		hardware: { value: 2e6, basis: 'estimate', note: 'Six 8-GPU H100 servers.' },
		response: { value: 0.009, basis: 'estimate', note: 'Launch price: $3 per million tokens in, $15 out.' }
	},
	{
		name: 'Grok 4',
		developer: 'xAI',
		date: 'Jul 2025',
		modality: 'text and images',
		params: { value: 3e12, basis: 'estimate', note: 'Epoch AI estimate.' },
		compute: {
			value: 5e26,
			basis: 'estimate',
			note: 'Epoch AI estimate, rated speculative. The largest run with a public estimate.'
		},
		memory: { value: 3600, basis: 'estimate', note: '3T parameters at 8-bit, plus working memory.' },
		hardware: { value: 2e6, basis: 'estimate', note: 'Six 8-GPU H100 servers.' },
		response: {
			value: 0.03,
			basis: 'estimate',
			note: '$3 in and $15 out, with about 2,000 reasoning tokens billed as output.'
		},
		aside: 'Epoch AI puts the training run at 246 million H100-hours, 310 GWh of electricity and about $490 million.'
	},
	{
		name: 'Kimi K3',
		developer: 'Moonshot AI',
		date: 'Jul 2026',
		modality: 'text, images, video',
		params: {
			value: 2.8e12,
			basis: 'stated',
			note: 'Open weights. A mixture of experts: about 104B of the 2.8T run per token.'
		},
		compute: { value: 2e25, basis: 'estimate', note: 'Epoch AI estimate, rated speculative.' },
		memory: { value: 1700, basis: 'estimate', note: '2.8T parameters shipped at 4-bit, plus working memory.' },
		hardware: {
			value: 7e5,
			basis: 'estimate',
			note: 'Two 8-GPU H200 servers. The only frontier-size model you could host yourself.'
		},
		response: {
			value: 0.009,
			basis: 'estimate',
			note: 'Our guess at $1 per million tokens in and $4 out, with reasoning tokens.'
		},
		aside: 'The largest model anyone can download. Its compute is modest because so little of it runs at once.'
	},
	{
		name: '2026 closed frontier',
		developer: 'OpenAI, Anthropic, Google, xAI',
		date: '2026',
		modality: 'text, images, audio, video',
		params: {
			value: 5e12,
			basis: 'projection',
			range: [2e12, 1e13],
			note: 'Undisclosed. Outside guesses run from 2T to 10T.'
		},
		compute: {
			value: 1e27,
			basis: 'projection',
			range: [3e26, 3e27],
			note: 'Undisclosed. Frontier compute has grown 4 to 5 times a year; from Grok 4 that lands near 10²⁷.'
		},
		memory: {
			value: 4000,
			basis: 'projection',
			range: [1500, 12000],
			note: 'About 5T parameters at 4-bit to 8-bit, plus working memory.'
		},
		hardware: {
			value: 3.5e6,
			basis: 'projection',
			range: [3e6, 9e6],
			note: 'One 72-GPU rack. A GB200 rack is about $3 million; the next generation is quoted at up to $8.8 million.'
		},
		response: {
			value: 0.08,
			basis: 'estimate',
			range: [0.03, 0.3],
			note: 'List prices are public: about $5 per million tokens in and $25 out. A reasoning answer of 3,000 tokens comes to about 8 cents; a long agent task costs dollars.'
		},
		aside: 'No lab has published size or compute for a 2026 flagship. Those rows are projections, not measurements.'
	}
];
