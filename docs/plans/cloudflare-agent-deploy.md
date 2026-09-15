# Plan: a coding agent on Cloudflare that builds and deploys another app

Status: idea, not started. Written 2026-09-15.

## Goal

Run a coding agent in a container on Cloudflare. It changes another app's code, tests it, and deploys that app to the same Cloudflare account, without being able to touch anything else in the account (this course site, its D1 database, its R2 bucket).

## How it would work

1. **Container.** A Worker starts a Cloudflare Container, or uses the Sandbox SDK, which wraps a container with a shell and file system. The agent gets a Linux box to clone, install, build and test in.
2. **Agent.** Claude Code or an agent built on the Claude Agent SDK runs inside the container. The Anthropic API key is a Worker secret passed into the container.
3. **Source of truth.** The agent pushes its work to a GitHub branch. The container is disposable, so nothing may live only on its disk.
4. **Deploy.** The build is deployed to the target app's Worker or domain. The Cloudflare token handling in the next section decides how.

`wrangler login` is a browser sign-in and does not work headless. Deploys need a Cloudflare API token.

## The main risk: account-wide permissions

Cloudflare API token permissions for Workers apply to the whole account. A token that can deploy app B can also redeploy or break app A. The agent must never hold that token directly.

Options, safest first:

| Option | How it isolates | Trade-off |
|---|---|---|
| **Deploy gatekeeper Worker** (recommended) | The container sends a finished build to a small deploy Worker. Only that Worker holds the Cloudflare token, and it accepts only an allowlist of app names. | You write and maintain the gatekeeper. |
| **Workers for Platforms** | Agent-built apps go into a dispatch namespace that cannot reach your other Workers. | Paid add-on; apps run through a dispatcher Worker. |
| **Separate Cloudflare account** | Complete separation. | Cannot share this account's D1 or R2 directly. |

## Human approval

Default to review before shipping:

1. The agent opens a pull request and deploys a preview (a separate preview Worker name, or a version upload without promoting it).
2. The agent posts the preview link and a summary.
3. A person approves, and then the gatekeeper promotes the build to production.

Auto-deploy only for apps where a broken deploy is cheap.

## Secrets and where they live

| Secret | Held by | Never given to |
|---|---|---|
| Anthropic API key | Orchestrator Worker, passed into the container per run | Logs, the deployed app |
| GitHub token (repo-scoped, fine-grained) | Container, for pushing branches and opening pull requests | The deployed app |
| Cloudflare API token (Workers Scripts edit) | Deploy gatekeeper Worker only | The container, the agent |

## Pieces to build

1. **Orchestrator Worker:** takes a task (repo, branch, instructions), starts the container, streams progress, and records results in D1.
2. **Container image:** Node, git, wrangler, Claude Code or the Agent SDK, and the target app's toolchain.
3. **Deploy gatekeeper Worker:** authenticates the orchestrator, checks the app name against the allowlist, uploads or promotes the Worker version, and logs every deploy.
4. **Approval step:** a page or a GitHub pull request check that triggers promotion.
5. **Logging:** every run and deploy recorded with who asked, what changed and what shipped.

## Limits to check before starting

- Container CPU, memory and maximum run time on the current plan.
- Cost per run: container time plus Anthropic tokens.
- Whether Sandbox SDK and Containers pricing and limits have changed.
- The wrangler version inside the image, and deploying with an API token in CI mode.

## Open questions

- Which app is the first target?
- Deploy on approval only, or auto-deploy?
- Workers for Platforms, a gatekeeper Worker, or a separate account?
- Who is allowed to start a run?
