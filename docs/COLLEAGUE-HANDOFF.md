# BacklinkPilot Colleague Handoff

This document is the fastest way for a teammate to understand what BacklinkPilot is becoming, how the main execution loop works today, and where product feedback is most valuable.

## What This Product Is

BacklinkPilot is being shaped into a consumer-grade backlink product, not an internal SEO console.

The intended user journey is:

1. Register a product
2. Generate a coverage plan
3. Turn the plan into executable tasks
4. Push those tasks toward visible proof
5. Understand spend, upgrade timing, and premium opportunities without guessing

The product is no longer just "submit to directories." It now has four connected layers:

- Product profile layer
- Task planning layer
- Managed execution layer
- Proof and budget layer

## Current Product Thesis

The product should answer five questions clearly:

1. What should I do next for this product?
2. Which backlink tasks are already in motion?
3. Which threads are closest to a visible result?
4. What will likely consume credits this week?
5. When should I upgrade, and when should I hold premium opportunities?

If a proposed change does not improve one of those five answers, it is probably local optimization rather than product progress.

## Main System Model

There are three persistent data layers:

### 1. Supabase app records

These are the user-facing canonical entities:

- `products`
- `submissions`
- `subscriptions`

Relevant loaders:

- [dashboard/page.tsx](/root/backlinkpilot/src/app/dashboard/page.tsx)
- [dashboard product page](/root/backlinkpilot/src/app/dashboard/product/[id]/page.tsx)

### 2. Workspace-side product state

These are persisted under the runtime data root and let the app behave like a workflow product instead of a pure DB app.

- Workspace task plans
- Managed inbox records
- Proof tasks
- Launch requests / packets / timelines

Core files:

- [workspace-task-plans.ts](/root/backlinkpilot/src/lib/workspace-task-plans.ts)
- [managed-inbox-server.ts](/root/backlinkpilot/src/lib/managed-inbox-server.ts)

### 3. External execution intelligence

This is fed from the backlink execution system and gives the SaaS app real supply and opportunity context.

- Discovery progress
- Paid target backlog
- Playbook lane recommendations
- Representative paid opportunities

Relevant read layer:

- [saas-operational-insights.ts](/root/backlinkpilot/src/lib/saas-operational-insights.ts)

## Core Runtime Flow

### A. Dashboard aggregation

The workspace entry point is [dashboard/page.tsx](/root/backlinkpilot/src/app/dashboard/page.tsx).

It loads:

- user and subscription
- products
- submissions
- operational insights
- workspace task plans
- managed inbox state
- proof summaries

It then passes the merged product state into [dashboard-client.tsx](/root/backlinkpilot/src/app/dashboard/dashboard-client.tsx).

### B. Task planning

The task-planning API lives in [task-plans route](/root/backlinkpilot/src/app/api/products/[id]/task-plans/route.ts).

It currently supports:

- auto coverage planning
- imported backlink lists
- competitor coverage planning
- materializing a competitor gap plan into real follow-up tasks

The planning logic lives in [workspace-task-plans.ts](/root/backlinkpilot/src/lib/workspace-task-plans.ts).

Important concept:

- A coverage plan is not just a note. It becomes a persisted plan object that can later spawn live `submissions` and premium watchlists.

### C. Managed inbox and outreach execution

The managed inbox layer is implemented in [managed-inbox-server.ts](/root/backlinkpilot/src/lib/managed-inbox-server.ts).

Its job is to turn "email outreach" from abstract copy into trackable product state:

- sender mode
- mailbox identity
- ops brief
- launch request
- packets
- timeline
- proof tasks

Important boundary:

- This is a real MVP with records, packets, timelines, and log ingestion
- It is not yet a full autonomous mail infra platform

### D. Proof pipeline

The proof layer is summarized in [proof-pipeline.ts](/root/backlinkpilot/src/lib/proof-pipeline.ts).

It scores products based on:

- submission receipts
- real replies
- thread stage
- proof task lifecycle

That summary drives:

- proof priority
- outcome ranking
- task queue ordering
- budget guidance

## What The Workspace Is Doing Now

The workspace UI in [dashboard-client.tsx](/root/backlinkpilot/src/app/dashboard/dashboard-client.tsx) is trying to compress a lot of backend complexity into product-native answers.

Current responsibilities:

- `Today Brief`: compress strongest signal, biggest blocker, and single best move
- `Task Queue`: show tasks instead of raw logs
- `Outcome Ladder` / proof ordering: prioritize products closest to visible results
- `Billing rule`: show whether a task is included, credit-based, or premium
- `Weekly burn`: estimate credit pressure without mixing in premium work
- `Budget call`: turn burn + proof pressure into a direct action

This means the dashboard is now acting as a decision surface, not just a navigation page.

## What Is Most Important To Critique

Ask the reviewer to focus on these questions:

1. Does the current dashboard still ask too much cognition from a normal user after login?
2. Is `task` the right product abstraction, or is there a better one for consumer users?
3. Is the managed inbox MVP honest and legible enough, or does it still feel too "internal ops"?
4. Are the burn and upgrade suggestions useful, or do they still feel synthetic?
5. Which step in the current loop still feels like software made by operators for operators, instead of by product people for customers?

## Best 30-Minute Review Path

If a teammate only has 30 minutes, tell them to read in this order:

1. [docs/COLLEAGUE-HANDOFF.md](/root/backlinkpilot/docs/COLLEAGUE-HANDOFF.md)
2. [dashboard/page.tsx](/root/backlinkpilot/src/app/dashboard/page.tsx)
3. [dashboard-client.tsx](/root/backlinkpilot/src/app/dashboard/dashboard-client.tsx)
4. [task-plans route](/root/backlinkpilot/src/app/api/products/[id]/task-plans/route.ts)
5. [workspace-task-plans.ts](/root/backlinkpilot/src/lib/workspace-task-plans.ts)
6. [managed-inbox-server.ts](/root/backlinkpilot/src/lib/managed-inbox-server.ts)
7. [proof-pipeline.ts](/root/backlinkpilot/src/lib/proof-pipeline.ts)

If they still have time after that, continue with:

8. [dashboard product page](/root/backlinkpilot/src/app/dashboard/product/[id]/page.tsx)
9. [product-detail.tsx](/root/backlinkpilot/src/app/dashboard/product/[id]/product-detail.tsx)

## Concrete Review Prompts To Send A Teammate

Use prompts like these instead of "take a look":

- "Ignore implementation detail first. Is the user journey coherent from product setup to proof?"
- "Which parts of this still feel like an internal tool rather than a consumer product?"
- "If you had to delete one dashboard section to improve clarity, which one would you cut?"
- "Where is the current pricing / credits / premium boundary still confusing or not credible?"
- "What is the next highest-leverage improvement if the goal is external launch readiness?"

## Current Honest Boundaries

A reviewer should understand what is real versus still partial:

### Real now

- Product setup and homepage preview
- Coverage planning
- Competitor plan materialization into real queued submissions
- Managed inbox record / packet / timeline model
- Proof scoring and ranking
- Billing-rule display and weekly burn estimation

### Still partial

- Full autonomous email infrastructure
- Fully automated premium opportunity handling
- Final production-grade credits ledger and charging
- Fully stabilized product detail execution experience

## What Not To Waste Review Energy On

Low-value review topics right now:

- polishing individual labels without changing comprehension
- micro-optimizing ops-only edge cases
- debating precise credit math before the product boundary is locked
- making the workspace more feature-dense

High-value review topics right now:

- clarity of the main loop
- trustworthiness of the value proposition
- whether premium / managed / standard paths are understandable
- where users will hesitate before paying or before launching tasks

## Suggested Handoff Message

Send the code with a fixed commit and a short request like:

> Please review this commit as a product system, not just as code. I want feedback on whether the user journey from product setup -> task planning -> execution -> proof -> budget guidance is coherent, and what still feels too internal or too complicated before we put this in front of users.

