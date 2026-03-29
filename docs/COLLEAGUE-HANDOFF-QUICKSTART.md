# BacklinkPilot 5-Minute System Quickstart

This is the shortest useful read for a teammate who needs to understand what BacklinkPilot is, how the product loop works today, and where product critique is most valuable.

For the longer version, continue with [COLLEAGUE-HANDOFF.md](/root/backlinkpilot/docs/COLLEAGUE-HANDOFF.md).
For a text-first architecture map, see [SYSTEM-ARCHITECTURE-TEXT.md](/root/backlinkpilot/docs/SYSTEM-ARCHITECTURE-TEXT.md).

## Product In One Sentence

BacklinkPilot is being shaped into a consumer-grade backlink product that helps a user register a product, generate backlink coverage plans, turn those plans into executable tasks, and push those tasks toward visible proof without making the user think like an operator.

## What The Product Is Trying To Solve

Most backlink tools stop at data, lists, or raw outreach mechanics.

This product is trying to answer a more product-native loop:

1. What should I do next?
2. What is already in motion?
3. What is closest to a visible result?
4. What will cost me credits?
5. When should I upgrade or hold premium work?

If a feature does not improve one of those answers, it is probably not on the main path.

## The Main Product Loop

The current intended loop is:

1. Register a product
2. Generate a coverage plan
3. Turn the plan into tasks
4. Run directory / outreach / managed-inbox work
5. Pull replies, receipts, and proof signals back into the workspace
6. Decide whether to keep pushing, verify proof, or upgrade

## The 6 Important Building Blocks

### 1. Product profile

The user starts by creating a product profile. That is the anchor for everything else.

### 2. Coverage plans

The product can create task plans from:

- system-generated coverage ideas
- imported backlink lists
- competitor URLs

These plans are not just notes. They persist and can materialize into real work.

Core files:

- [page.tsx](/root/backlinkpilot/src/app/dashboard/page.tsx)
- [route.ts](/root/backlinkpilot/src/app/api/products/[id]/task-plans/route.ts)
- [workspace-task-plans.ts](/root/backlinkpilot/src/lib/workspace-task-plans.ts)

### 3. Executable task queue

The dashboard tries to show product-shaped tasks instead of raw logs.

Examples:

- coverage tasks
- competitor gap tasks
- live submission tasks
- proof tasks

The goal is that the user sees a queue of meaningful work, not a pile of system internals.

### 4. Managed inbox

This is the MVP layer for email-style outreach.

It already models:

- mailbox identity
- sender mode
- launch request
- packets
- timeline
- reply state

It is a real product layer, but not yet a full autonomous mail platform.

Core file:

- [managed-inbox-server.ts](/root/backlinkpilot/src/lib/managed-inbox-server.ts)

### 5. Proof pipeline

The app tries to rank products and tasks by closeness to visible proof.

Signals include:

- submission receipts
- reply threads
- proof task lifecycle
- publication-ready states

Core file:

- [proof-pipeline.ts](/root/backlinkpilot/src/lib/proof-pipeline.ts)

### 6. Budget and upgrade layer

The workspace now shows:

- billing rule per task
- weekly credit burn estimates
- budget guidance
- direct action suggestions

This is meant to turn pricing from a separate page into an in-product decision system.

## What The Dashboard Is Actually Doing

The main workspace lives in:

- [page.tsx](/root/backlinkpilot/src/app/dashboard/page.tsx)
- [dashboard-client.tsx](/root/backlinkpilot/src/app/dashboard/dashboard-client.tsx)

It is trying to behave like a decision surface, not a navigation menu.

Current sections include:

- `Today Brief`
- `Task Queue`
- `Outcome Ladder`
- `Proof Board`
- `Budget call`

The taste question is not "is each section useful in isolation?" It is "does the first screen make the next action more obvious or more confusing?"

## What Is Real Vs Partial

### Real now

- product setup
- task planning
- competitor planning
- competitor plan materialization into real tasks
- managed inbox records and packets
- proof task lifecycle
- billing-rule display
- weekly burn estimation

### Still partial

- fully autonomous mailbox infrastructure
- full premium-opportunity workflow
- true billing settlement
- perfect consumer-grade information architecture

## Where A Teammate Should Be Skeptical

Ask them to pressure-test these:

1. Is `task` the right core abstraction for users, or just the easiest one for us?
2. Does the dashboard still require too much thinking after login?
3. Which parts still feel like an operator console wearing a consumer UI?
4. Is the managed inbox MVP honest enough, or does it imply more automation than actually exists?
5. Does the budget / credits / premium model feel credible?

## Best 5-Minute Read Order

If they truly only have 5 minutes:

1. This document
2. [page.tsx](/root/backlinkpilot/src/app/dashboard/page.tsx)
3. [dashboard-client.tsx](/root/backlinkpilot/src/app/dashboard/dashboard-client.tsx)
4. [workspace-task-plans.ts](/root/backlinkpilot/src/lib/workspace-task-plans.ts)
5. [managed-inbox-server.ts](/root/backlinkpilot/src/lib/managed-inbox-server.ts)
6. [proof-pipeline.ts](/root/backlinkpilot/src/lib/proof-pipeline.ts)

## What Feedback Is Most Valuable Right Now

The highest-value feedback is not "rename this function" or "refactor this hook."

The highest-value feedback is:

- where the product loop is still broken
- where the UX is still asking users to think like operators
- where the pricing / task / proof logic is not credible enough for external users
- what the next 1 to 3 product moves should be before wider launch
