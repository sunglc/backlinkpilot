# BacklinkPilot System Architecture (Text Version)

This document is a text-first system diagram for teammates who want to understand how the product is structured before reading the code.

For shorter context, start with [COLLEAGUE-HANDOFF-QUICKSTART.md](/root/backlinkpilot/docs/COLLEAGUE-HANDOFF-QUICKSTART.md).  
For the longer product handoff, continue with [COLLEAGUE-HANDOFF.md](/root/backlinkpilot/docs/COLLEAGUE-HANDOFF.md).

## North Star

BacklinkPilot is not trying to be a raw SEO console.

It is trying to become a consumer-grade product that helps a user:

1. register a product
2. generate coverage plans
3. turn plans into executable backlink work
4. see what is moving toward visible proof
5. understand spend, upgrade timing, and premium opportunities

## System At A Glance

```text
                        +----------------------------------+
                        |           User Workspace         |
                        |  /dashboard and product detail   |
                        +----------------+-----------------+
                                         |
                                         v
                 +-----------------------+------------------------+
                 |     Next.js App / Product Decision Surface     |
                 |    pages, APIs, ranking, budget, proof logic   |
                 +-----------+---------------------+--------------+
                             |                     |
                             |                     |
                             v                     v
          +------------------+---+        +--------+------------------+
          |  Canonical App Records |      | Workspace Runtime State   |
          |  Supabase              |      | persisted workflow state  |
          |  - products            |      | - task plans              |
          |  - submissions         |      | - managed inbox records   |
          |  - subscriptions       |      | - proof tasks             |
          +------------------------+      +---------------------------+
                             \                     /
                              \                   /
                               \                 /
                                v               v
                        +--------+------------------------+
                        | External Execution Intelligence |
                        | and Backlink Ops System         |
                        | - discovery progress            |
                        | - paid opportunities            |
                        | - playbook lanes                |
                        | - email logs / reply logs       |
                        +----------------+----------------+
                                         |
                                         v
                           +-------------+-------------+
                           | Product-Level Outcomes    |
                           | proof, priority, budget,  |
                           | next actions, upgrade     |
                           +---------------------------+
```

## The 4 Core Data Layers

### 1. User-facing canonical records

These are the stable product entities in Supabase:

- `products`
- `submissions`
- `subscriptions`

These are the main records the customer conceptually owns.

Key entry points:

- [page.tsx](/root/backlinkpilot/src/app/dashboard/page.tsx)
- [page.tsx](/root/backlinkpilot/src/app/dashboard/product/[id]/page.tsx)

### 2. Workspace runtime state

This is the layer that makes the SaaS behave like a workflow product instead of just a CRUD app.

It stores product-adjacent state such as:

- coverage plans
- competitor plans
- materialized task plans
- managed inbox records
- launch packets
- proof tasks

Key files:

- [workspace-task-plans.ts](/root/backlinkpilot/src/lib/workspace-task-plans.ts)
- [managed-inbox-server.ts](/root/backlinkpilot/src/lib/managed-inbox-server.ts)

### 3. External execution intelligence

This comes from the separate backlink execution system and gives the SaaS real supply-side context.

Examples:

- daily discovery progress
- discovery gap vs target
- paid opportunity backlog
- playbook lane recommendations
- representative paid opportunities
- live email submission logs
- live reply monitor logs

Key file:

- [saas-operational-insights.ts](/root/backlinkpilot/src/lib/saas-operational-insights.ts)

### 4. Product decision layer

This is the layer that translates all the raw inputs into product-facing decisions.

Examples:

- which product deserves attention first
- which task is closest to proof
- which work should consume credits
- when the user should upgrade
- when premium opportunities should stay on hold

Key files:

- [dashboard-client.tsx](/root/backlinkpilot/src/app/dashboard/dashboard-client.tsx)
- [proof-pipeline.ts](/root/backlinkpilot/src/lib/proof-pipeline.ts)

## The Main Product Loops

### Loop A: Product setup

```text
User creates product
  -> product profile stored
  -> preview / enrichment can run
  -> product becomes anchor for planning and execution
```

### Loop B: Task planning

```text
Product
  -> generate coverage plan
  -> import backlink list
  -> map competitor URLs
  -> persist plan object
  -> optionally materialize plan into real follow-up tasks
```

Key API:

- [route.ts](/root/backlinkpilot/src/app/api/products/[id]/task-plans/route.ts)

### Loop C: Managed execution

```text
Plan / product
  -> live submission work
  -> managed inbox launch request
  -> packets / timelines / sender mode
  -> send activity and reply activity flow back in
```

Important truth:

- this is already more than a mock
- this is not yet a fully autonomous outbound platform

### Loop D: Proof pipeline

```text
submission receipts
+ reply threads
+ packet state
+ proof task lifecycle
  -> proof score
  -> outcome ladder
  -> priority ranking
  -> next best action
```

### Loop E: Budget and upgrade guidance

```text
task type
+ task stage
+ proof pressure
+ premium opportunity context
  -> billing rule
  -> weekly burn estimate
  -> budget call
  -> direct action
```

## What The Dashboard Really Is

The dashboard is not just a navigation page.

It is trying to be a single decision surface that answers:

1. What is my strongest signal today?
2. What is my biggest blocker?
3. Which task should I move now?
4. Which product is closest to visible value?
5. What spend is likely this week?
6. Should I keep pushing, verify proof, or upgrade?

That is why the dashboard has sections like:

- `Today Brief`
- `Task Queue`
- `Outcome Ladder`
- `Proof Board`
- `Billing rule`
- `Weekly burn`
- `Budget call`

## Important State Transitions

There are a few transitions that matter more than everything else:

### 1. Plan -> Task

If planning does not reliably turn into executable tasks, the product becomes an idea board.

### 2. Task -> Execution evidence

If the user cannot see receipts, packets, or reply movement, the product feels fake.

### 3. Execution evidence -> Proof

If the system cannot elevate promising work toward proof, the user will not feel compounding value.

### 4. Proof pressure -> Spend guidance

If spend and upgrade logic are not tied to real momentum, pricing will feel synthetic.

## Current Honest Boundaries

### Solid enough to review seriously

- product setup
- planning flows
- competitor planning
- task materialization
- managed inbox record model
- live log ingestion into workspace state
- proof ranking
- budget guidance

### Still partial and should not be oversold

- fully autonomous email infrastructure
- final premium-service operating model
- production-grade credits ledger
- perfectly stabilized detail-page execution experience

## Where Reviewers Should Focus

The best critique is not "this hook could be cleaner."

The best critique is:

- does the architecture support a believable consumer product
- where is the system still shaped too much by operator thinking
- which abstraction is wrong even if the code is correct
- where the loop from task to proof still breaks
- whether the pricing boundary is product-trustworthy

## Best Code Read Order

1. [page.tsx](/root/backlinkpilot/src/app/dashboard/page.tsx)
2. [dashboard-client.tsx](/root/backlinkpilot/src/app/dashboard/dashboard-client.tsx)
3. [route.ts](/root/backlinkpilot/src/app/api/products/[id]/task-plans/route.ts)
4. [workspace-task-plans.ts](/root/backlinkpilot/src/lib/workspace-task-plans.ts)
5. [managed-inbox-server.ts](/root/backlinkpilot/src/lib/managed-inbox-server.ts)
6. [proof-pipeline.ts](/root/backlinkpilot/src/lib/proof-pipeline.ts)
7. [page.tsx](/root/backlinkpilot/src/app/dashboard/product/[id]/page.tsx)
8. [product-detail.tsx](/root/backlinkpilot/src/app/dashboard/product/[id]/product-detail.tsx)
