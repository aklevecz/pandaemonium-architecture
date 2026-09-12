# Lab 02 plan: Applied Autopoiesis

Week 02, September 21, Shoggoth with a Smiley Face. Whole lab is Ariel's. 1:00 to 3:50.

Syllabus lab line:
- Vibe coding introduction: Codec app; Github
- HuggingFace, Fal.ai
- ComfyUI, Fuser, Krea, Higgsfield

Framing, one slide: a system that builds its own parts. Maturana and Varela, autopoiesis (1972): a system that produces the components that produce it. Codec is an agent harness where everything is a plugin, including the agent's own tools; students use the agent to make a tool, then use the tool.

## Timings

| Time | Block | What happens |
| --- | --- | --- |
| 1:00 | Framing | Slides 1 to 4. Ten minutes. |
| 1:10 | Codec, on the projector | Ariel runs Codec; the room directs it out loud. One task to show the loop, then the vibe-coding task: a page that shows a random line from `lines.txt`. Then init and push to GitHub, live. Thirty minutes. |
| 1:40 | GitHub | Students make accounts and one empty repository each. Ten minutes. |
| 1:50 | HuggingFace and Fal | Model cards; run a Space; run a Fal model. Ariel has the agent wire the Fal call into the page on the projector. Thirty minutes. |
| 2:20 | Break | Ten minutes. |
| 2:30 | Four interfaces | ComfyUI on a GPU machine, then the same graph in Fuser, then Krea, then Higgsfield. Same prompt in all four. Forty minutes. |
| 3:10 | Wrap | Four questions for a tool; assignment. Ten minutes. |
| 3:20 | Codec on your own laptop, optional | For anyone who wants it: Node, clone, `scripts/setup.sh`, a handout file, `pnpm dsh web`. Thirty minutes, and it can run over. |

## Before class (Ariel)

- [ ] Mint a handful of handouts for the optional install at the end: in the cliproxy repo, `./add-client.sh <name>`. It writes `<name>.codec.env` to `~/.cliproxy-clients/`. Mint on demand for whoever stays, or a few in advance under placeholder names. AirDrop in the room; do not email them to a list.
- [ ] Run `./health.sh` on the proxy the morning of. It does a real completion per provider.
- [ ] Decide whether student keys survive the class or get revoked after (`./add-client.sh --revoke <name>`).
- [ ] Confirm whether the A211H machines have GPUs for ComfyUI. If not, ComfyUI is a demo on one machine and Fuser is the hands-on node graph.
- [ ] Fal credits: check the current free allowance on a new account. If it is not enough for a few runs, decide whether to fund a shared key or make Fal a demo.
- [ ] Check Krea and Higgsfield free tiers the week of; both change.
- [ ] Your own Codec is built and the proxy handout is in place on the projector machine. Run the vibe-coding task once beforehand so the live run is not the first.
- [ ] Test the install path on a clean machine anyway, so the optional block at the end goes smoothly: Node 24, `corepack enable`, clone, `scripts/setup.sh`, handout `.env`, `pnpm dsh web`.

## Before class (students), from the starter checklist

- Accounts on github.com, huggingface.co, fal.ai, fuser.studio, krea.ai, higgsfield.ai.
- Optional, only for anyone who wants Codec on their own machine at the end: Node.js 24 and Git installed, the codec repository cloned and built. The starter `SETUP.md` covers it.

## Fallbacks

- Codec on the projector fails mid-session: the page and the GitHub push were rehearsed, so fall back to showing the rehearsed result and narrating the loop.
- Optional install will not build on a laptop: Path A, `npx @deepseek-ai/dsh web`, runs upstream without the Codec changes and needs a DeepSeek key rather than the handout. Or stop; it is optional.
- No GPU in the room: ComfyUI becomes a demo on one machine; Fuser carries the node-graph exercise.
- Fal costs: one shared key on the projector, students watch the call, then the agent wires the call with a placeholder key.
- Wifi: everything in the second half is hosted. Codec itself runs locally; only the model calls need the network.

## Materials

- Deck: `src/lib/data/lab-decks/lab-02.md` (draft).
- Labs repo folder: `lab-02-shoggoth-with-a-smiley-face/` with `README.md`, `starter/SETUP.md`, `starter/lines.txt`.
- No new site pages needed. Every station is an external tool or the student's own machine.

## Open decisions

- Default model behind the handout is Claude via the proxy. Is that what you want students building against, or DeepSeek?
- Assignment: left as "to be filled in" on the last slide and in the repo README.
- Whether the vibe-coding task stays generic (random line page) or targets their project. Generic is safer for a first run; project-specific if you want the session to feed week 4's seed.

## Readings this week that the lab touches

- Benzel, Notes on Thinking Machine Imaginaries: Llull's combinatorial wheels; what is loaded into the machine determines what comes out. The vibe-coding task is a loading exercise: the words you give the agent are the wheel's contents.
- Strickler, Dark Forest; qntm, Antimemetics: not in the lab directly.
