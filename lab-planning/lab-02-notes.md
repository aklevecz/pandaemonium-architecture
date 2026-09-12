# Lab 02 notes: Applied Autopoiesis

Deck: `/lab/2`. Repo folder: `lab-02-shoggoth-with-a-smiley-face`.

Written to go deeper than the slides when someone asks, and to review from. Lab 01 was about what a model does. This lab is about the machinery wrapped around a model: the harness, the host, the interface.

---

## 0. The frame in one paragraph

Nobody uses a model. They use something wrapped around a model. Today the room touches four layers of that wrapping: an agent harness you direct in plain language (Codec), a place the work is kept (GitHub), places the weights live and run (HuggingFace, Fal), and four consumer interfaces onto the same class of image model (ComfyUI, Fuser, Krea, Higgsfield). The through line from Lab 01: each layer decides more of the sampler settings for you, and shows you less of what it decided.

---

## 1. Autopoiesis, stated carefully

Maturana and Varela, 1972: an autopoietic system is one that continuously produces the components that produce it, and in doing so produces its own boundary. Their case was the living cell. The claim was biological and specific, and they resisted extending it to social systems. Luhmann extended it to social systems anyway, which is where most humanities usage comes from.

A plugin system where the agent can write plugins is not autopoiesis in Maturana's sense. It does not produce its own boundary, and it does not produce the substrate it runs on. It is self-extension, which is a weaker and older idea (a compiler compiling itself, a Lisp macro, a shell script that writes shell scripts).

Say the analogy and say the limit. If someone pushes: the interesting question is not whether Codec is alive, it is what it takes for a system to modify its own parts without a person in the loop, and what stops it.

---

## 2. What an agent harness actually is

This is the whole thing, and it is smaller than people expect:

1. Send the model a prompt plus a list of available tools, described as JSON schemas.
2. The model replies with either text (done) or a request to call a tool with arguments.
3. The harness executes that tool, in code you wrote, on the machine.
4. The result is appended to the conversation.
5. Go to step 1.

That loop is the agent. Everything else is quality of life: which tools exist, how the context is trimmed when it grows too long, what gets shown to the user, what requires approval.

Two things worth naming in the room:

- The model does not run anything. It emits a string that says "call `read_file` with path X". The harness decides whether to honor that. Every safety property lives in the harness, not the model.
- The tool list is data. It is part of the prompt. That is why an agent can be given a new capability without retraining anything, and why "everything is a plugin" is a design about the prompt as much as the code.

### Codec specifically

Codec is a fork of a harness where the plugin is the unit of everything: tools, commands, the interface. Practical facts for the projector session:

- Node 24. `node -v` should print 24.
- `scripts/setup.sh`, then `pnpm dsh web`, web UI on port 3080.
- It needs a `.env` with credentials, which is why the install is optional and at the end.

Run one task on the projector where the agent writes a plugin and then uses it. The point lands only if the room sees the second half, the using.

---

## 3. Vibe coding

Karpathy, February 2025: describing software in natural language and accepting the result without reading it. The phrase caught on because it named something people were already doing and slightly ashamed of.

What it is good at: throwaway tools, glue, formats you do not want to learn, the first 80 percent of something small, code where being wrong is cheap and obvious.

What it is bad at: anything where being wrong is silent. Concurrency, security boundaries, money, migrations, anything touching real user data. The failure mode is not code that does not run, it is code that runs and is subtly wrong, in a codebase nobody has read.

The honest framing for a lab: you are not avoiding understanding, you are deferring it. The bill comes when it breaks. That is a real tradeoff, sometimes worth taking, and the skill is knowing which side of the line you are on.

If asked whether this makes programmers obsolete: the reading skill (can you tell whether this diff is right) becomes more valuable, not less, because you are now reviewing more code than you write.

---

## 4. Git and GitHub

Keep the distinction crisp, because most students conflate them:

- **Git** is a program on your laptop, Linus Torvalds 2005, written to host the Linux kernel after BitKeeper's licence was pulled. It records snapshots of a directory. It works with no network.
- **GitHub** is a company that hosts copies of git repositories and adds a website, issues, pull requests, and permissions. Microsoft bought it in 2018. GitLab, Codeberg, and a plain server with `git` installed do the same job.

Minimum viable model for the room:

- A **commit** is a snapshot plus a message plus a pointer to its parent. It is not a diff, though it is usually shown as one.
- A **branch** is a movable label pointing at a commit. That is all it is.
- **Remote** is another copy. `push` sends commits to it, `pull` brings them back.
- **Clone** is copying the whole history, not just the current files. This is why git is called distributed: every clone is a full backup.

Why it matters for this course: it is the difference between work that exists and work that exists somewhere other than one laptop. Say plainly that this is also a surveillance question. A public repo is a public record of when you worked and what you tried, and GitHub trains on public code.

---

## 5. HuggingFace and Fal: two different things

Students blur these. They are not the same layer.

**HuggingFace** is mostly a place weights live. A model repository holds the weight files, a config, a tokenizer, and a model card (the README describing training data, licence, intended use, known failures). It also hosts the `transformers` and `diffusers` libraries, datasets, and Spaces (small hosted demos). You can download the weights and run them yourself.

Two details worth saying out loud:

- **File format.** Older weights ship as `.ckpt`, which is Python pickle, which executes arbitrary code on load. `.safetensors` was introduced in 2022 precisely to stop that. Prefer safetensors. This is a real supply chain issue, not a hypothetical, and it connects directly to the seminar's security material.
- **The model card is a document, not a guarantee.** Licence, training data, and eval numbers are claims by the uploader.

**Fal** is inference as a service. You do not get the weights. You send a request, they run the model on their GPUs, you get an image or a video back and a charge per call. Same for Replicate, and for the image endpoints of the big labs.

The tradeoff, stated flatly: running weights yourself costs hardware and setup and gives you the sampler; calling an API costs money per image and gives you someone else's sampler. Lab 01's fourth question, who set the sampler, has a different answer in each case.

---

## 6. Four interfaces, one kind of model

This is the spine of the second half. All four are, underneath, latent diffusion of the kind covered in Lab 01. What changes is how much of the apparatus is exposed.

- **ComfyUI.** A node graph. You wire the checkpoint, the prompt encoders, the empty latent, the sampler, the VAE decode. Steps, scheduler, CFG scale, seed, and denoise strength are all on screen as fields. Nothing is hidden and nothing is chosen for you, which is why it is both the best teaching tool and the worst first experience.
- **Fuser.** More packaged. Blending and composition are the frame; the sampler is mostly gone from view.
- **Krea.** Realtime. The canvas updates as you draw. That is only possible because the model has been distilled to run in one to four steps instead of thirty (Lab 08 covers how). The tradeoff is real and worth naming: fewer steps, less diversity per seed.
- **Higgsfield.** Video, with camera moves offered as named presets. The preset is the interface's opinion about what a shot is.

Exercise for the room, if there is time: same prompt, same intent, four interfaces, and write down for each one what you were allowed to set and what was set for you. That list is the lab.

---

## 7. Questions to expect

**"Is the agent actually thinking?"** It emits tool calls that a program executes. Whether that is thinking is the seminar's question. In the harness it is a loop, and you can read the loop.

**"Why not just use ChatGPT?"** You can. The difference is that a local harness can touch your filesystem and your repo, and you can read what it did. That is also the risk.

**"Is my code being trained on?"** Depends on the provider and the plan, and the answer changes. The safe assumption for anything sensitive is yes.

**"Which of the four should I use?"** For making things, whichever is fastest for you. For this course, at least one session in ComfyUI, because it is the only one that shows you the settings you are otherwise inheriting.

---

## 8. References

- Maturana and Varela, *Autopoiesis and Cognition*, 1980 (Spanish original 1972).
- Karpathy, the vibe coding post, February 2025.
- Torvalds, git, 2005. `git help everyday` is the useful subset.
- Rombach et al., *High-Resolution Image Synthesis with Latent Diffusion Models*, 2022. Assigned in week 1.
- HuggingFace safetensors documentation, on why pickle loading is unsafe.
- qntm, *There Is No Antimemetics Division*, assigned this week, for the seminar half.
