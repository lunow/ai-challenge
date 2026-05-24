# ✈️ Airport Traffic Control (ATC) System - Project Report

This report outlines the scheduling approach, technical choices, design decisions, and engineering lessons learned during the development of the **Airport Traffic Control (ATC) MCP Server and TUI Dashboard**.

***

## 1. Scheduling Approach and Key Decisions

The scheduling logic is the core of the airport operations model. It solves a resource-constrained scheduling problem under priority and dependency constraints.

### Greedy List Scheduling with Topological Sorting

To schedule flights safely without resource conflicts:

- **Dependency DAG**: We model flight dependencies as a Directed Acyclic Graph (DAG). We detect cycles upfront using DFS to identify and reject invalid cyclic flight plans.
- **Topological Sort**: Flights are scheduled in topological order. A flight is only eligible for scheduling once all its upstream dependencies have been successfully scheduled.
- **Priority-Based Sorting**: Ready flights are sorted by priority (`high` > `medium` > `low`), then by `plannedTime`, and finally by flight number (to ensure deterministic tie-breaking).
- **Resource Reservations**: Runways, gates, and ground crews are modeled as time-interval reservations. The scheduler checks runway separation buffers (landing-landing, takeoff-takeoff, mixed buffers), gate turnaround times, and crew assignment intervals, picking the earliest available start time that satisfies all constraints.

### Key Architectural Decisions

- **Aircraft-Gate Turnaround Linkage**: A departure that depends on an arrival represents the same physical aircraft. The scheduler forces these flights to **share the same gate continuously** from landing to takeoff, extending the gate reservation time dynamically to ensure no other aircraft enters the gate during turnaround.
- **Simulator-Aligned Scheduling Horizon**: Rather than scheduling relative to the real-world system clock, the scheduler aligns its time window with the current simulated clock (`simulatedTime`). This keeps manual flight entries in sync with mock scenarios.
- **Backward Critical Path Analysis**: For bottleneck analysis, the scheduler starts at the last-completing flight in the queue and traces backward through the resource and dependency constraints that bounded its start time.

***

## 2. Tools and Techniques Used

- **Node.js, TypeScript, & ESM**: Built as an ECMAScript Module (ESM) using TypeScript for complete type safety, ESM packaging compatibility, and rapid compilation.
- **Model Context Protocol (MCP)**: Utilizes the `@modelcontextprotocol/sdk` to build a stdio JSON-RPC transport server. This exposes tools (`submit_flight`, `generate_schedule`, `get_airport_status`, `cancel_flight`, `analyze_bottlenecks`, `reset_airport`) and resources (`flights://queue`, `resources://availability`, `flights://timeline`) to AI clients.
- **Unified Memory-Grid TUI**: Built a terminal UI using a unified 2D screen buffer in memory. The entire dashboard is written to the terminal in a single write operation, preventing screen flickering.
- **Raw Keypress Input Handling**: Configured `process.stdin` in raw mode (`setRawMode(true)`) to listen to keypresses character-by-character. This bypassed standard Node.js line-buffered `readline` blockers and allowed background dashboard ticking and active menu typing to run in parallel.
- **Gemini 3.5 Flash (Medium and High) with Antigravity**: The entire codebase, test suites, live dashboard CLI, and documentation were created using **Gemini 3.5 Flash (Medium and High)** models paired with the **Antigravity** developer agent. The agent's shell execution, multi-replace edits, and file viewing tools made iterating and resolving terminal-handling bugs very easy.

***

## 3. What Worked and What Did Not

### What Worked

- **Raw Keypress TUI**: Discarding Node's core `readline` interface in favor of a raw keypress listener and a centralized memory-grid render loop was highly successful. It completely eliminated cursor displacement, keyboard lockups, and stdout race conditions.
- **Deterministic Resource Allocation**: The interval-overlap check and greedy assignment logic proved to be extremely reliable, passing all custom test suites.
- **Mock Scenario Auto-Suffixing**: Automatically appending numeric suffixes (e.g. `AA101_1`) to scenario flights and dynamically updating their internal dependencies allowed the user to repeatedly queue scenarios, resolving duplicate-key errors.

### What Did Not & How We Pivoted

- **Concurrency in Stdio**: Initially, the background ticking clock called the server status tool every second while the user was interacting with option prompts. In early tests, parallel printing disrupted `readline`'s internal cursor-tracking. We pivoted by decoupling data-fetching (fetching state in the background and after user actions) and writing the final terminal output as a single consolidated block of text.
- **System-Time Planning**: We initially mapped `HH:MM` time inputs directly to the current real-world date. If a scenario clock was running on a simulated date (e.g. May 23rd) but the user manually added a flight at `12:33` local time today (May 24th), the flight was scheduled 24 hours in the future. We pivoted to parsing the user's `HH:MM` input relative to the active `simulatedTime` date.
