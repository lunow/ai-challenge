# ✈️ Airport Traffic Control (ATC) MCP Server & Live Dashboard

Welcome to the **Airport Traffic Control (ATC) Model Context Protocol (MCP) Server**. This repository implements a fully reactive, AI-ready coordination and scheduling system for a busy airport. It manages runway separation buffers, gate turnaround windows, ground crew constraints, cascading cancellations, and critical path bottleneck analysis.

It is equipped with a standalone standard-I/O **MCP Server** for AI integrations, and a robust, beautiful **TUI Live Dashboard** that runs in parallel.

---

## 📺 TUI Live Dashboard CLI (Highlight)

We have built a premium, colorized terminal UI (TUI) that provides a real-time monitor and action prompt in a split-screen view. The dashboard ticks simulated time in the background while allowing you to type commands and trigger actions in parallel without cursor jumping or prompt corruption.

### Running the CLI:
1. Ensure dependencies are installed:
   ```bash
   npm install
   ```
2. Start the interactive console:
   ```bash
   npm run cli
   ```

### Features of the TUI Dashboard:
* **Left Column (Live Operations Dashboard)**: A ticking clock (1 minute per second), live runway landing/takeoff indicators, gates occupancy mapping, ground crew standby/working statuses, flight count queues, and unscheduled/congested notifications.
* **Right Column (ATC Tower Action Menu)**:
  * **Option 1**: Submit a new flight plan (Arrival/Departure) with priority, planned time, gate/runway constraints, and dependencies. Supports entering times in both full ISO formats and simple local `HH:MM` formats.
  * **Option 2**: Generate/Refresh airport schedule.
  * **Option 3**: Cancel a flight (triggers cascading cancellations of downstream dependent flights).
  * **Option 4**: Run critical path bottleneck analysis.
  * **Options 5-7**: Inspect raw JSON resources (timeline, queue, resource availability).
  * **Options 8-10**: Run mock scenarios (**Morning Rush**, **Heavy Hauler**, **Connecting Flight**) that append to the queue. If run repeatedly, mock flight numbers and dependencies are automatically suffixed (e.g., `AA101` becomes `AA101_1`) to allow flights to stack up without key collisions.
  * **Option 11**: Exit.

---

## 🛠 Installation & Build

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm (Node Package Manager)

### Steps
1. Navigate to the project directory:
   ```bash
   cd task4
   ```
2. Install the package dependencies:
   ```bash
   npm install
   ```
3. Compile the TypeScript files:
   ```bash
   npm run build
   ```
4. Run the automated Jest-like unit tests to verify the scheduling logic:
   ```bash
   npm test
   ```

---

## ⚙️ Environment Variables Configuration

The server parses all constraints and capacity limits from environment variables. These are loaded from the `.env` file at startup (which is also read and prioritized by the CLI). 

Create a `.env` file in the root of the project with the following keys:

| Environment Variable | Type | Description | Accepted Values |
| :--- | :--- | :--- | :--- |
| `RUNWAY_COUNT` | Integer | The number of active runways at the airport. | `> 0` (e.g. `2`) |
| `GATE_COUNT` | Integer | The number of available airport gates. | `> 0` (e.g. `5`) |
| `GROUND_CREW_COUNT` | Integer | The number of active ground crew teams. | `> 0` (e.g. `3`) |
| `RUNWAY_BUFFER_TAKEOFF` | Integer | Buffer time in minutes between consecutive takeoffs on a runway. | `>= 0` (e.g. `2`) |
| `RUNWAY_BUFFER_LANDING` | Integer | Buffer time in minutes between consecutive landings on a runway. | `>= 0` (e.g. `3`) |
| `RUNWAY_BUFFER_MIXED` | Integer | Buffer time in minutes between consecutive landing & takeoff operations on a runway. | `>= 0` (e.g. `5`) |
| `GATE_TURNAROUND_TIME` | Integer | Time in minutes an aircraft occupies a gate (gate turnaround buffer). | `>= 0` (e.g. `45`) |
| `DEPENDENCY_BUFFER_TIME` | Integer | Buffer time in minutes required between a dependency flight landing and its dependent taking off. | `>= 0` (e.g. `15`) |
| `MAX_SCHEDULING_HORIZON` | Integer | Maximum scheduling horizon in minutes from the earliest flight to attempt scheduling. | `> 0` (e.g. `1440`) |
| `GROUND_CREW_SERVICE_TIME`| Integer | Service duration in minutes for ground crew unloading (arrivals) or towing (departures). | `>= 0` (e.g. `30`) |

---

## 🔌 Running the Server standalone & Client Setup

### Running the MCP Server
To start the Model Context Protocol (MCP) server standalone on standard I/O (Stdio):
```bash
npm start
```
*(Alternatively, run `npx tsx src/index.ts` to execute directly with tsx during development).*

### Connecting from an MCP Client

To connect an AI client (like **Claude Desktop** or **Cursor**) to the server, point the client configuration to run the command in our directory. 

#### Claude Desktop Setup:
Add the following configuration to your `claude_desktop_config.json` (located at `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "airport-traffic-control": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/task4/src/index.ts"],
      "env": {
        "RUNWAY_COUNT": "2",
        "GATE_COUNT": "5",
        "GROUND_CREW_COUNT": "3",
        "RUNWAY_BUFFER_TAKEOFF": "2",
        "RUNWAY_BUFFER_LANDING": "3",
        "RUNWAY_BUFFER_MIXED": "5",
        "GATE_TURNAROUND_TIME": "45",
        "DEPENDENCY_BUFFER_TIME": "15",
        "MAX_SCHEDULING_HORIZON": "1440",
        "GROUND_CREW_SERVICE_TIME": "30"
      }
    }
  }
}
```

---

## 🧰 Reference: Exposed Tools & Resources

Once connected, the MCP server exposes the following capabilities:

### MCP Tools

1. **`submit_flight`**
   * **Description**: Submits a new flight plan to the pending queue.
   * **Parameters**: 
     * `flightNumber` (string, required): e.g. `AA123`
     * `operationType` (string, required): `arrival` or `departure`
     * `priority` (string, required): `high`, `medium`, or `low`
     * `plannedTime` (string, required): ISO 8601 string (e.g., `2026-05-24T12:00:00Z`)
     * `dependencies` (array of strings, optional): Dependent flight numbers.
     * `runwayRequirement` (string, optional): Specific runway constraint (e.g. `Runway 2`).
     * `gateRequirement` (string, optional): Specific gate constraint (e.g. `Gate 1`).

2. **`generate_schedule`**
   * **Description**: Refreshes the schedule database. Resolves cycles, priorities, and buffer requirements, allocating runway slots, gates, and ground crews.
   * **Parameters**:
     * `simulatedTime` (string, optional): ISO string to align scheduling horizon and calculations with a specific simulated clock time.

3. **`get_airport_status`**
   * **Description**: Computes active flight counts, occupancy metrics, congestion alerts (flags congested when resource occupancy `>= 80%`), list of unscheduled/blocked flights with reasons, and overall schedule completion time.
   * **Parameters**:
     * `simulatedTime` (string, optional): ISO string representing the current simulated clock.

4. **`cancel_flight`**
   * **Description**: Cancels a flight and recursively cascades cancellation to any dependent flights (e.g., if arrival `AA100` is cancelled, departure `DL200` depending on it is automatically cancelled and annotated with a cascading reason).
   * **Parameters**:
     * `flightNumber` (string, required): e.g. `AA123`
     * `reason` (string, optional): Cancellation reason.

5. **`analyze_bottlenecks`**
   * **Description**: Performs critical path analysis. Traces backward from the last completing flight through the constraining dependencies to identify the chain driving the overall scheduling delay. Returns the delay path and total accumulated delay minutes.

6. **`reset_airport`**
   * **Description**: Resets the flight queue and schedule database to a clean, empty state.

---

### MCP Resources

1. **`flights://queue`** (JSON)
   * **Description**: The complete list of flights currently in the queue, including their status (`unscheduled`, `scheduled`, `cancelled`), planned times, assigned runways/gates, and cancellation reasons.
2. **`resources://availability`** (JSON)
   * **Description**: Detailed allocation grid showing occupied time intervals for each Runway, Gate, and Ground Crew team.
3. **`flights://timeline`** (JSON)
   * **Description**: A chronological list of events for all scheduled operations (e.g., landing, gate entry, crew assignment, crew release, takeoff, gate exit).
