---
number: 2
title: Applied Autopoiesis
stance: Loading
draft: true
blurb: Vibe coding with Codec, GitHub, HuggingFace and Fal, and four interfaces to one kind of model.
---

@title
eyebrow: Lab 02 · September 21 · Shoggoth with a Smiley Face
# Applied Autopoiesis

Codec, GitHub, HuggingFace, Fal, ComfyUI, Fuser, Krea, Higgsfield.

---

@statement
A system that builds its own parts.
note: Maturana and Varela, 1972: autopoiesis, a system that produces the components that produce it.

---

@prose
## What we do today

Codec is an agent harness. Everything in it is a plugin, including the tools the agent uses, and the agent can write plugins. You will use the agent to make a tool, then use the tool.

Then you will run models you did not build, on machines you do not own, through four different interfaces.

---

@list
## Where we are going
1. Codec, on the projector. You direct it.
2. Vibe coding: a tool made by describing it.
3. GitHub: the thing we made, kept somewhere other than this laptop.
4. HuggingFace and Fal: models as things you call.
5. ComfyUI, Fuser, Krea, Higgsfield: one kind of model, four interfaces.

---

@demo
## Codec, on the projector

I run it. You say what it should do.

[Open Codec](http://127.0.0.1:3080)

1. Workspace: the folder for this lab. Nothing else in it but lines.txt.
2. First task, so you see the loop: Summarize this folder.
3. Watch what comes back: the model's reply, the tool it asked to run, the result fed back in.
4. Watch what it asks permission for, and what it does not.

---

@prose
## What a harness is

The model is a function from text to text. The harness is everything around it: the loop that reads the model's reply, runs the tool it asked for, and feeds the result back. Permissions, the workspace, the tools themselves.

In Codec every one of those is a plugin. The agent can read the plugin that defines a tool, and it can write a new one.

---

@demo
## Vibe coding: make a tool

Someone in the room gives the task. Small, with a visible result.

[Open Codec](http://127.0.0.1:3080)

1. Task: Make a web page in this folder that shows one random line from lines.txt every time it loads.
2. We read the files it wrote before we open the page.
3. If it is wrong, someone says what is wrong. Not how to fix it.
4. Someone asks for one feature they would not know how to write.

---

@statement
Describe the result you want, not the code.

---

@prose
## Where it breaks

The agent reads the workspace, not your intent. It does what the words say.

It stops when the permission policy gates something. Read the prompt before you approve it. It can delete files it made. Keep the workspace to the folder for this lab.

---

@demo
## GitHub

The page now lives somewhere other than this laptop. Then yours.

[The labs repository](https://github.com/CA-Skunk-Works/pandaemonium-labs)

1. On the projector: Initialize git in this folder and push it to <repository URL>. Watch which commands it asks to run.
2. Refresh the repository page.
3. You: make a GitHub account if you do not have one.
4. Create one empty repository, named for something you might make. Leave it empty. It is where week 4's project goes.

---

@statement
Ten minutes.

---

@prose
## Model hubs

HuggingFace is a repository of models and datasets. Each model has a page, the model card: what it was trained on, when, by whom, under what license, to the extent the author chose to say.

Fal runs models on rented GPUs and charges per run. You call a URL with text and get an image back.

---

@demo
## HuggingFace

[Model cards](https://huggingface.co/models)

1. Make an account.
2. Open the model card for a model you have used through a product: Stable Diffusion, FLUX, Llama.
3. Find the section on training data. Write down what it says, or that it says nothing.
4. Open a Space that runs the model. Run it once.

---

@demo
## Fal

[Model playground](https://fal.ai/models)

1. Make an account. Note the credit balance.
2. Run an image model from the playground. Note what it cost.
3. Copy the API example for that model.
4. On the projector, in Codec: Add a button to the page that sends its text to this Fal model and shows the image. The API example is pasted in. The key is mine; that is why it is on the projector and not on your laptop.

---

@statement
The tool we described now calls a model nobody in this room built, on a machine nobody in this room owns.

---

@prose
## Four interfaces to one kind of model

ComfyUI is a node graph on your own GPU. Every step is a node; every setting is exposed.

Fuser is a node graph on someone else's GPU, in the browser.

Krea and Higgsfield are products: a text box and a button. The graph is there; you cannot see it.

All four run latent diffusion models.

---

@demo
## ComfyUI

On a machine with a GPU.

[ComfyUI](https://github.com/comfyanonymous/ComfyUI)

1. Load the default workflow.
2. Name the nodes: checkpoint loader, text encoder, sampler, VAE decode. That is last week's slide drawn as boxes.
3. Same seed. Change the sampler from Euler to DDIM, then to Euler a. Compare.
4. Change steps from 20 to 5.

---

@demo
## Fuser

The same graph, hosted.

[Fuser](https://fuser.studio/)

1. Make an account.
2. Build the graph: text, image model, output.
3. Find the sampler and steps controls, if they are exposed.
4. Run the prompt you used in ComfyUI.

---

@demo
## Krea

[Krea](https://www.krea.ai/)

1. Make an account.
2. Generate the same prompt.
3. Count every setting the interface lets you change.
4. Find the seed, if there is one.

---

@demo
## Higgsfield

[Higgsfield](https://higgsfield.ai/)

1. Make an account.
2. Generate a short video from the same prompt.
3. List what you could set and what you could not.

---

@list
## Four questions for a tool
1. What can you set?
2. What is set for you, and by whom?
3. Where does it run, and who is paying for that?
4. Where is the seed?

---

@prompt
## Assignment

To be filled in.

---

@demo
## Codec on your own laptop

Optional. For anyone who wants to stay. Thirty minutes if it goes well.

[Setup guide](https://github.com/CA-Skunk-Works/pandaemonium-labs/blob/main/lab-02-shoggoth-with-a-smiley-face/starter/SETUP.md)

1. Install Node.js 24. `node -v` prints 24.
2. Clone the codec repository. Run `scripts/setup.sh`. Several minutes.
3. Get a `<name>.codec.env` file from me. Save it as `.env` in the codec folder.
4. `pnpm dsh web`. Send it the same task we ran on the projector.
