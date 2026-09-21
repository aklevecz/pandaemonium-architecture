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
	aside?: string;
}

export const SOURCES = [
	{
		label: 'Stable Diffusion v1 model card',
		href: 'https://huggingface.co/CompVis/stable-diffusion-v1-4'
	},
	{ label: 'Epoch AI, Data on AI Models', href: 'https://epoch.ai/data/ai-models' },
	{
		label: 'Epoch AI, What did it take to train Grok 4?',
		href: 'https://epoch.ai/data-insights/grok-4-training-resources'
	}
];

export const models: ScaleModel[] = [
	{
		name: 'Stable Diffusion 1.5',
		developer: 'CompVis, Stability AI, Runway',
		date: 'Oct 2022',
		modality: 'text to image',
		params: {
			value: 1.07e9,
			basis: 'stated',
			note: '860M U-Net, 123M text encoder, 84M autoencoder.'
		},
		compute: {
			value: 5e22,
			basis: 'estimate',
			note: 'From the model card: 150,000 A100-hours on 256 GPUs, at 30% utilization.'
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
		compute: { value: 2.1e25, basis: 'estimate', note: 'Epoch AI estimate, rated likely.' }
	},
	{
		name: 'Gemini 1.0 Ultra',
		developer: 'Google DeepMind',
		date: 'Dec 2023',
		modality: 'text, images, audio, video',
		compute: { value: 5e25, basis: 'estimate', note: 'Epoch AI estimate, rated speculative.' }
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
		}
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
		aside: 'Epoch AI puts the run at 246 million H100-hours, 310 GWh of electricity and about $490 million.'
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
		aside: 'No lab has published either number for a 2026 flagship. This row is a projection, not a measurement.'
	}
];
