import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import readline from 'readline';
import { stdin as input, stdout as output } from 'process';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// ANSI Escape Codes for Rich Terminal Styling
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

const FG_RED = '\x1b[31m';
const FG_GREEN = '\x1b[32m';
const FG_YELLOW = '\x1b[33m';
const FG_BLUE = '\x1b[34m';
const FG_MAGENTA = '\x1b[35m';
const FG_CYAN = '\x1b[36m';
const FG_WHITE = '\x1b[37m';

const BG_BLUE = '\x1b[44m';

// State Management
let client: Client;
let simulatedTime: Date = new Date();
let monitorIntervalId: NodeJS.Timeout | null = null;

// UI Buffers & State
let inputBuffer = '';
let currentPrompt = 'Select Action (1-11): ';
let resolvePrompt: ((val: string) => void) | null = null;

let lastStatusText = 'No status available.';
let lastAvail: any = {};
let lastTimeline: any[] = [];
let responseLog: string[] = [];

// Helper: Check if a time falls in an interval
function isTimeInInterval(time: Date, startStr: string, endStr: string): boolean {
  const t = time.getTime();
  const s = new Date(startStr).getTime();
  const e = new Date(endStr).getTime();
  return t >= s && t < e;
}

// Reset simulated clock to the earliest planned time in queue
async function resetSimulatedClock() {
  try {
    const queueRes = await client.readResource({ uri: 'flights://queue' });
    const queue = JSON.parse((queueRes.contents?.[0] as any)?.text || '[]');
    
    if (queue.length > 0) {
      let earliest = new Date(queue[0].plannedTime);
      for (const f of queue) {
        const planned = new Date(f.plannedTime);
        if (planned < earliest) earliest = planned;
      }
      simulatedTime = earliest;
    } else {
      simulatedTime = new Date();
    }
  } catch (e) {
    simulatedTime = new Date();
  }
}

// Fetch all necessary states from the server
async function fetchAirportState() {
  try {
    const statusResult = await client.callTool({
      name: 'get_airport_status',
      arguments: { simulatedTime: simulatedTime.toISOString() }
    });
    lastStatusText = (statusResult as any).content?.[0]?.text || 'No status available.';

    const availRes = await client.readResource({ uri: 'resources://availability' });
    lastAvail = JSON.parse((availRes.contents?.[0] as any)?.text || '{}');

    const timelineRes = await client.readResource({ uri: 'flights://timeline' });
    lastTimeline = JSON.parse((timelineRes.contents?.[0] as any)?.text || '[]');
  } catch (err) {
    // Fail silently in monitor
  }
}

// Log response message into the scrolling log buffer
function logResponse(message: string) {
  const rawLines = message.split('\n');
  const flatLines: string[] = [];
  
  // Wrap longer lines to fit within 46 columns
  for (const line of rawLines) {
    if (line.length > 46) {
      flatLines.push(line.substring(0, 46));
      flatLines.push('  ' + line.substring(46, 90));
    } else {
      flatLines.push(line);
    }
  }
  
  responseLog.push(...flatLines);
  if (responseLog.length > 6) {
    responseLog = responseLog.slice(-6);
  }
  
  drawScreen();
}

// Build the left-side dashboard layout lines
function getLeftLines(): string[] {
  const lines: string[] = [];
  lines.push(`${BG_BLUE}${FG_WHITE}${BOLD}      AIRPORT OPERATIONS DASHBOARD      ${RESET}`);
  lines.push(`${BOLD}Simulated Time:${RESET} ${FG_GREEN}${simulatedTime.toLocaleTimeString()}${RESET} ${DIM}(Ticking 1m/s)${RESET}`);
  lines.push(`${DIM}------------------------------------------------------------${RESET}`);

  // Runways
  lines.push(`${BOLD}${FG_CYAN}RUNWAY STATUS:${RESET}`);
  const runways = lastAvail.runways || {};
  const runwayIds = Object.keys(runways);
  if (runwayIds.length === 0) {
    lines.push(`  ${DIM}No runways configured.${RESET}`);
  } else {
    for (const rwId of runwayIds) {
      const activeFlight = runways[rwId].find((f: any) => {
        const diff = Math.abs(simulatedTime.getTime() - new Date(f.scheduledTime).getTime());
        return diff < 60 * 1000; // 1 minute landing/takeoff block
      });

      if (activeFlight) {
        const action = activeFlight.operationType === 'arrival' ? '✈ LANDING' : '🛫 TAKEOFF';
        lines.push(`  ${rwId}: [${FG_RED}${BOLD}${action}${RESET}] Flight ${FG_WHITE}${BOLD}${activeFlight.flightNumber}${RESET}`);
      } else {
        lines.push(`  ${rwId}: [${FG_GREEN}  FREE  ${RESET}]`);
      }
    }
  }

  // Gates
  lines.push(``);
  lines.push(`${BOLD}${FG_CYAN}GATES MAP:${RESET}`);
  const gates = lastAvail.gates || {};
  const gateIds = Object.keys(gates);
  if (gateIds.length === 0) {
    lines.push(`  ${DIM}No gates configured.${RESET}`);
  } else {
    for (const gateId of gateIds) {
      const active = gates[gateId].find((f: any) => isTimeInInterval(simulatedTime, f.occupiedFrom, f.occupiedTo));
      if (active) {
        lines.push(`  ${gateId}: [${FG_YELLOW}${BOLD}OCCUPIED${RESET}] Flight ${FG_WHITE}${active.flightNumber}${RESET}`);
      } else {
        lines.push(`  ${gateId}: [${FG_GREEN}  FREE  ${RESET}]`);
      }
    }
  }

  // Ground Crews
  lines.push(``);
  lines.push(`${BOLD}${FG_CYAN}GROUND CREWS STATUS:${RESET}`);
  const crews = lastAvail.groundCrews || {};
  const crewIds = Object.keys(crews);
  if (crewIds.length === 0) {
    lines.push(`  ${DIM}No crews configured.${RESET}`);
  } else {
    for (const crewId of crewIds) {
      const active = crews[crewId].find((f: any) => isTimeInInterval(simulatedTime, f.busyFrom, f.busyTo));
      if (active) {
        lines.push(`  ${crewId}: [${FG_MAGENTA}${BOLD}WORKING ${RESET}] Flight ${FG_WHITE}${active.flightNumber}${RESET}`);
      } else {
        lines.push(`  ${crewId}: [${FG_BLUE}STANDBY ${RESET}]`);
      }
    }
  }

  // Metrics
  lines.push(``);
  lines.push(`${BOLD}${FG_CYAN}METRICS & QUEUES:${RESET}`);
  const statusLines = lastStatusText.split('\n');
  const countLines = statusLines.filter((l: string) => l.trim().startsWith('-'));
  for (const l of countLines.slice(0, 3)) {
    lines.push(` ${l}`);
  }

  // Unscheduled
  const blockedSection = statusLines.indexOf('Blocked/Unscheduled Flights:');
  if (blockedSection !== -1) {
    lines.push(`  ${FG_RED}${BOLD}Blocked/Unscheduled flights!${RESET}`);
    let count = 0;
    for (let i = blockedSection + 1; i < statusLines.length && count < 2; i++) {
      if (statusLines[i].trim()) {
        lines.push(`  ${FG_YELLOW}${statusLines[i].substring(0, 48)}${RESET}`);
        count++;
      }
    }
  }

  // Flatten newlines
  const flatLines: string[] = [];
  for (const line of lines) {
    if (line.includes('\n')) {
      flatLines.push(...line.split('\n'));
    } else {
      flatLines.push(line);
    }
  }
  return flatLines;
}

// Redraw the entire screen from the constructed in-memory buffers
function drawScreen() {
  const leftLines = getLeftLines();
  
  // Clean wrapped response log to exactly fit the layout (up to 6 lines)
  const paddedResponseLog = [...responseLog];
  while (paddedResponseLog.length < 6) {
    paddedResponseLog.push('');
  }

  // Right side content matching row positions exactly
  const rightLines: string[] = [
    `${BG_BLUE}${FG_WHITE}${BOLD}          ATC TOWER - ACTION MENU          ${RESET}`,
    ` ${FG_GREEN}[1]${RESET} Submit a new flight plan`,
    ` ${FG_GREEN}[2]${RESET} Generate/Refresh airport schedule`,
    ` ${FG_GREEN}[3]${RESET} Cancel a flight (with cascade)`,
    ` ${FG_GREEN}[4]${RESET} Run Bottleneck Analysis`,
    ` ${FG_GREEN}[5]${RESET} View Raw Flight Queue (Resource)`,
    ` ${FG_GREEN}[6]${RESET} View Complete Timeline (Resource)`,
    ` ${FG_GREEN}[7]${RESET} View Resource Availability (Resource)`,
    ` ${FG_YELLOW}[8]${RESET} Run Scenario 1: Morning Rush`,
    ` ${FG_YELLOW}[9]${RESET} Run Scenario 2: Heavy Hauler`,
    ` ${FG_YELLOW}[10]${RESET} Run Scenario 3: Connecting Flight`,
    ` ${FG_RED}[11]${RESET} Exit CLI`,
    `${DIM}----------------------------------------------${RESET}`,
    ``,
    `${BOLD}${currentPrompt}${inputBuffer}${RESET}`,
    ``,
    `${FG_CYAN}${BOLD}RESPONSE LOG:${RESET}`,
    `${DIM}----------------------------------------------${RESET}`,
    ...paddedResponseLog
  ];

  const maxRows = Math.max(leftLines.length, rightLines.length);
  const outputLines: string[] = [];
  
  // Merge left & right column views line by line
  for (let r = 0; r < maxRows; r++) {
    const left = leftLines[r] || '';
    const right = rightLines[r] || '';
    
    // Strip ANSI sequences to count actual visual characters
    const cleanLeft = left.replace(/\x1b\[[0-9;]*[mGJK]/g, '');
    const padding = ' '.repeat(Math.max(0, 60 - cleanLeft.length));
    
    outputLines.push(`${left}${padding}│ ${right}\x1b[K`);
  }

  // Clear screen and redraw to avoid cursor offsets, then clear remainder of screen
  process.stdout.write('\x1b[H' + outputLines.join('\n') + '\x1b[J');

  // Place the cursor right after the prompt value on row 15
  const cleanPrompt = currentPrompt.replace(/\x1b\[[0-9;]*[mGJK]/g, '');
  const cursorRow = 15;
  const cursorCol = 60 + 2 + cleanPrompt.length + inputBuffer.length;
  process.stdout.write(`\x1b[${cursorRow};${cursorCol}H`);
}

// Asynchronously prompt user for input using the unified keypress render system
function askQuestion(promptText: string): Promise<string> {
  currentPrompt = promptText;
  inputBuffer = '';
  drawScreen();
  return new Promise((resolve) => {
    resolvePrompt = resolve;
  });
}

// Start background dashboard clock ticking
function startDashboardTicker() {
  if (monitorIntervalId) {
    clearInterval(monitorIntervalId);
  }
  monitorIntervalId = setInterval(async () => {
    simulatedTime = new Date(simulatedTime.getTime() + 60 * 1000);
    await fetchAirportState();
    drawScreen();
  }, 1000);
}

// Keypress Listener Setup
function setupKeypressListener() {
  readline.emitKeypressEvents(input);
  if (input.isTTY) {
    input.setRawMode(true);
  }

  input.on('keypress', async (ch, key) => {
    // Graceful exit on Ctrl+C
    if (key && key.ctrl && key.name === 'c') {
      if (monitorIntervalId) clearInterval(monitorIntervalId);
      await client.close();
      process.stdout.write('\x1b[2J\x1b[H');
      console.log(`${FG_GREEN}Goodbye!${RESET}`);
      process.exit(0);
    }

    if (key && (key.name === 'return' || key.name === 'enter')) {
      const val = inputBuffer;
      inputBuffer = '';
      if (resolvePrompt) {
        const resolve = resolvePrompt;
        resolvePrompt = null;
        resolve(val);
      }
    } else if (key && (key.name === 'backspace' || key.name === 'delete')) {
      inputBuffer = inputBuffer.slice(0, -1);
      drawScreen();
    } else if (ch && ch.length === 1 && !key.ctrl && !key.meta) {
      // Append printable characters
      inputBuffer += ch;
      drawScreen();
    }
  });
}

// Helper to submit scenario mock flights, suffixing them if duplicates exist to prevent collisions in the queue
async function submitScenarioFlights(scenarioFlights: any[]) {
  const queueRes = await client.readResource({ uri: 'flights://queue' });
  const queue = JSON.parse((queueRes.contents?.[0] as any)?.text || '[]');
  const existingFlightNumbers = new Set(queue.map((f: any) => f.flightNumber.toUpperCase()));

  const nameMap = new Map<string, string>();

  for (const f of scenarioFlights) {
    const originalName = f.flightNumber.toUpperCase();
    let uniqueName = originalName;
    if (existingFlightNumbers.has(uniqueName)) {
      let counter = 1;
      while (existingFlightNumbers.has(`${originalName}_${counter}`)) {
        counter++;
      }
      uniqueName = `${originalName}_${counter}`;
    }
    nameMap.set(originalName, uniqueName);
    existingFlightNumbers.add(uniqueName);
  }

  for (const f of scenarioFlights) {
    const finalName = nameMap.get(f.flightNumber.toUpperCase())!;
    const mappedDeps = (f.dependencies || []).map((dep: string) => {
      const depUpper = dep.toUpperCase();
      return nameMap.has(depUpper) ? nameMap.get(depUpper)! : depUpper;
    });

    await client.callTool({
      name: 'submit_flight',
      arguments: {
        ...f,
        flightNumber: finalName,
        dependencies: mappedDeps
      }
    });
  }
}

// Main Interactive Action Menu Loop
async function runMenuLoop() {
  while (true) {
    const choice = await askQuestion('Select Action (1-11): ');

    switch (choice.trim()) {
      case '1': {
        const flightNumber = await askQuestion('Flight Number (e.g. AA123): ');
        if (!flightNumber.trim()) {
          logResponse(`${FG_RED}Flight number cannot be empty.${RESET}`);
          break;
        }

        const typeChoice = await askQuestion('Type (1=Arrival, 2=Departure): ');
        const operationType = typeChoice.trim() === '1' ? 'arrival' : 'departure';

        const priChoice = await askQuestion('Priority (1=High, 2=Medium, 3=Low): ');
        let priority: 'high' | 'medium' | 'low' = 'medium';
        if (priChoice.trim() === '1') priority = 'high';
        else if (priChoice.trim() === '3') priority = 'low';

        const defaultTime = new Date().toISOString();
        const plannedTimeInput = await askQuestion(`Planned Time (default: now, formats: ISO or HH:MM): `);
        let plannedTime = plannedTimeInput.trim() || defaultTime;

        // Support HH:MM and HH:MM:SS formats, converting them to a valid ISO string on the current local date
        const timeMatch = plannedTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
        if (timeMatch) {
          const hours = parseInt(timeMatch[1], 10);
          const minutes = parseInt(timeMatch[2], 10);
          const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
          
          if (hours >= 24 || minutes >= 60 || seconds >= 60) {
            logResponse(`${FG_RED}Error: Invalid time values (hours < 24, minutes < 60, seconds < 60).${RESET}`);
            break;
          }
          
          const d = new Date(simulatedTime);
          d.setHours(hours, minutes, seconds, 0);
          plannedTime = d.toISOString();
        }

        const depsInput = await askQuestion('Dependencies (comma-separated): ');
        const dependencies = depsInput.trim() ? depsInput.split(',').map(s => s.trim().toUpperCase()) : [];

        const rwInput = await askQuestion('Runway Requirement (optional): ');
        const runwayRequirement = rwInput.trim() || undefined;

        const gateInput = await askQuestion('Gate Requirement (optional): ');
        const gateRequirement = gateInput.trim() || undefined;

        logResponse(`${FG_YELLOW}Submitting flight plan...${RESET}`);
        try {
          const res = await client.callTool({
            name: 'submit_flight',
            arguments: {
              flightNumber: flightNumber.trim().toUpperCase(),
              operationType,
              priority,
              plannedTime,
              dependencies,
              runwayRequirement,
              gateRequirement
            }
          });
          logResponse((res as any).content?.[0]?.text || 'Submitted.');
          await resetSimulatedClock();
          await fetchAirportState();
          drawScreen();
        } catch (e: any) {
          logResponse(`${FG_RED}Error: ${e.message}${RESET}`);
        }
        break;
      }

      case '2': {
        logResponse(`${FG_YELLOW}Refreshing schedule...${RESET}`);
        try {
          const res = await client.callTool({
            name: 'generate_schedule',
            arguments: { simulatedTime: simulatedTime.toISOString() }
          });
          logResponse((res as any).content?.[0]?.text || 'Refreshed.');
          await resetSimulatedClock();
          await fetchAirportState();
          drawScreen();
        } catch (e: any) {
          logResponse(`${FG_RED}Error: ${e.message}${RESET}`);
        }
        break;
      }

      case '3': {
        const flightNumber = await askQuestion('Flight number to cancel: ');
        if (!flightNumber.trim()) {
          logResponse(`${FG_RED}Flight number cannot be empty.${RESET}`);
          break;
        }
        const reason = await askQuestion('Reason (optional): ');

        logResponse(`${FG_YELLOW}Cancelling flight ${flightNumber.trim().toUpperCase()}...${RESET}`);
        try {
          const res = await client.callTool({
            name: 'cancel_flight',
            arguments: {
              flightNumber: flightNumber.trim().toUpperCase(),
              reason: reason.trim() || undefined
            }
          });
          logResponse((res as any).content?.[0]?.text || 'Cancelled.');
          await fetchAirportState();
          drawScreen();
        } catch (e: any) {
          logResponse(`${FG_RED}Error: ${e.message}${RESET}`);
        }
        break;
      }

      case '4': {
        logResponse(`${FG_YELLOW}Analyzing bottlenecks...${RESET}`);
        try {
          const res = await client.callTool({ name: 'analyze_bottlenecks', arguments: {} });
          logResponse((res as any).content?.[0]?.text || 'No bottlenecks.');
        } catch (e: any) {
          logResponse(`${FG_RED}Error: ${e.message}${RESET}`);
        }
        break;
      }

      case '5': {
        logResponse(`${FG_YELLOW}Loading Flight Queue...${RESET}`);
        try {
          const res = await client.readResource({ uri: 'flights://queue' });
          logResponse((res.contents?.[0] as any)?.text || 'Empty Queue.');
        } catch (e: any) {
          logResponse(`${FG_RED}Error: ${e.message}${RESET}`);
        }
        break;
      }

      case '6': {
        logResponse(`${FG_YELLOW}Loading Timeline...${RESET}`);
        try {
          const res = await client.readResource({ uri: 'flights://timeline' });
          const text = (res.contents?.[0] as any)?.text || '[]';
          const timeline = JSON.parse(text);
          let summary = '';
          for (const ev of timeline.slice(0, 5)) {
            const timeStr = new Date(ev.time).toLocaleTimeString();
            summary += `[${timeStr}] ${ev.flightNumber}: ${ev.type}\n`;
          }
          logResponse(summary || 'Timeline is empty.');
        } catch (e: any) {
          logResponse(`${FG_RED}Error: ${e.message}${RESET}`);
        }
        break;
      }

      case '7': {
        logResponse(`${FG_YELLOW}Loading Resource Availability...${RESET}`);
        try {
          const res = await client.readResource({ uri: 'resources://availability' });
          logResponse((res.contents?.[0] as any)?.text || 'No data.');
        } catch (e: any) {
          logResponse(`${FG_RED}Error: ${e.message}${RESET}`);
        }
        break;
      }

      case '8': {
        logResponse(`${FG_YELLOW}Running Scenario 1: Morning Rush...${RESET}`);
        try {
          const morningRushFlights = [
            { flightNumber: 'AA101', operationType: 'arrival', priority: 'high', plannedTime: '2026-05-23T08:00:00Z', dependencies: [] },
            { flightNumber: 'DL202', operationType: 'departure', priority: 'medium', plannedTime: '2026-05-23T08:05:00Z', dependencies: [] },
            { flightNumber: 'UA303', operationType: 'arrival', priority: 'low', plannedTime: '2026-05-23T08:00:00Z', dependencies: [] },
            { flightNumber: 'LH404', operationType: 'departure', priority: 'low', plannedTime: '2026-05-23T08:05:00Z', dependencies: [] }
          ];
          await submitScenarioFlights(morningRushFlights);
          const schedRes = await client.callTool({
            name: 'generate_schedule',
            arguments: { simulatedTime: simulatedTime.toISOString() }
          });
          logResponse((schedRes as any).content?.[0]?.text || 'Morning Rush generated.');
          await resetSimulatedClock();
          await fetchAirportState();
          drawScreen();
        } catch (e: any) {
          logResponse(`${FG_RED}Error: ${e.message}${RESET}`);
        }
        break;
      }

      case '9': {
        logResponse(`${FG_YELLOW}Running Scenario 2: Heavy Hauler...${RESET}`);
        try {
          const heavyHaulerFlights = [
            {
              flightNumber: 'HVY99',
              operationType: 'departure',
              priority: 'high',
              plannedTime: '2026-05-23T08:00:00Z',
              dependencies: [],
              runwayRequirement: 'Runway Long (4000m)'
            },
            {
              flightNumber: 'OK101',
              operationType: 'arrival',
              priority: 'medium',
              plannedTime: '2026-05-23T08:00:00Z',
              dependencies: []
            }
          ];
          await submitScenarioFlights(heavyHaulerFlights);
          const schedRes = await client.callTool({
            name: 'generate_schedule',
            arguments: { simulatedTime: simulatedTime.toISOString() }
          });
          logResponse((schedRes as any).content?.[0]?.text || 'Heavy Hauler generated.');
          await resetSimulatedClock();
          await fetchAirportState();
          drawScreen();
        } catch (e: any) {
          logResponse(`${FG_RED}Error: ${e.message}${RESET}`);
        }
        break;
      }

      case '10': {
        logResponse(`${FG_YELLOW}Running Scenario 3: Connecting Flight...${RESET}`);
        try {
          const inboundTime = '2026-05-23T08:00:00Z';
          const outboundTargetTime = '2026-05-23T08:05:00Z';
          const connectingFlights = [
            { flightNumber: 'AA100', operationType: 'arrival', priority: 'high', plannedTime: inboundTime, dependencies: [] },
            { flightNumber: 'DL200', operationType: 'departure', priority: 'medium', plannedTime: outboundTargetTime, dependencies: ['AA100'] }
          ];
          await submitScenarioFlights(connectingFlights);
          const schedRes = await client.callTool({
            name: 'generate_schedule',
            arguments: { simulatedTime: simulatedTime.toISOString() }
          });
          logResponse((schedRes as any).content?.[0]?.text || 'Connecting Flight generated.');
          await resetSimulatedClock();
          await fetchAirportState();
          drawScreen();
        } catch (e: any) {
          logResponse(`${FG_RED}Error: ${e.message}${RESET}`);
        }
        break;
      }

      case '11': {
        logResponse(`${FG_YELLOW}Exiting...${RESET}`);
        if (monitorIntervalId) clearInterval(monitorIntervalId);
        await client.close();
        process.stdout.write('\x1b[2J\x1b[H');
        console.log(`${FG_GREEN}Goodbye!${RESET}`);
        process.exit(0);
      }

      default: {
        logResponse(`${FG_RED}Invalid option. Choose 1-11.${RESET}`);
      }
    }
  }
}

async function runCli() {
  const serverPath = path.resolve(process.cwd(), 'src/index.ts');

  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['tsx', serverPath],
    env: {
      ...process.env,
      RUNWAY_COUNT: process.env.RUNWAY_COUNT || '2',
      GATE_COUNT: process.env.GATE_COUNT || '5',
      GROUND_CREW_COUNT: process.env.GROUND_CREW_COUNT || '3',
      RUNWAY_BUFFER_TAKEOFF: process.env.RUNWAY_BUFFER_TAKEOFF || '2',
      RUNWAY_BUFFER_LANDING: process.env.RUNWAY_BUFFER_LANDING || '3',
      RUNWAY_BUFFER_MIXED: process.env.RUNWAY_BUFFER_MIXED || '5',
      GATE_TURNAROUND_TIME: process.env.GATE_TURNAROUND_TIME || '45',
      DEPENDENCY_BUFFER_TIME: process.env.DEPENDENCY_BUFFER_TIME || '15',
      MAX_SCHEDULING_HORIZON: process.env.MAX_SCHEDULING_HORIZON || '1440',
      GROUND_CREW_SERVICE_TIME: process.env.GROUND_CREW_SERVICE_TIME || '30'
    }
  });

  client = new Client(
    {
      name: 'atc-interactive-cli',
      version: '1.0.0'
    },
    {
      capabilities: {}
    }
  );

  try {
    await client.connect(transport);
  } catch (err: any) {
    process.exit(1);
  }

  // Clear console initially
  process.stdout.write('\x1b[2J\x1b[H');

  // Pre-load clock and run initial fetches
  await resetSimulatedClock();
  await fetchAirportState();
  
  // Setup Raw Terminal Keypress handling
  setupKeypressListener();

  // Start background ticker
  startDashboardTicker();

  // Draw initial layout
  drawScreen();

  // Run the right-side interactive loop
  await runMenuLoop();
}

runCli();
