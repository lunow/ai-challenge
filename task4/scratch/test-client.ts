import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const serverPath = path.resolve(__dirname, '../src/index.ts');
  console.log(`Connecting to MCP server at: ${serverPath}`);

  // Create transport that spawns the server
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['tsx', serverPath],
    env: {
      ...process.env,
      RUNWAY_COUNT: '2',
      GATE_COUNT: '3',
      GROUND_CREW_COUNT: '2',
      RUNWAY_BUFFER_TAKEOFF: '2',
      RUNWAY_BUFFER_LANDING: '3',
      RUNWAY_BUFFER_MIXED: '5',
      GATE_TURNAROUND_TIME: '45',
      DEPENDENCY_BUFFER_TIME: '15',
      MAX_SCHEDULING_HORIZON: '1440',
      GROUND_CREW_SERVICE_TIME: '30'
    }
  });

  const client = new Client(
    {
      name: 'atc-test-client',
      version: '1.0.0'
    },
    {
      capabilities: {}
    }
  );

  await client.connect(transport);
  console.log('Successfully connected to ATC MCP Server!\n');

  // Helper to call tools
  async function callTool(name: string, args: Record<string, any> = {}) {
    console.log(`>>> Calling Tool: ${name} with args:`, JSON.stringify(args));
    const result = await client.callTool({ name, arguments: args });
    console.log(`<<< Response:\n`, result.content?.[0]?.text);
    console.log('--------------------------------------------------\n');
  }

  // Helper to read resources
  async function readResource(uri: string) {
    console.log(`>>> Reading Resource: ${uri}`);
    const result = await client.readResource({ uri });
    console.log(`<<< Response:\n`, result.contents?.[0]?.text);
    console.log('--------------------------------------------------\n');
  }

  const now = new Date('2026-05-23T12:00:00Z');

  // 1. Submit flights
  console.log('1. SUBMITTING FLIGHT PLANS...');
  // AA100 arrival landing at 12:00
  await callTool('submit_flight', {
    flightNumber: 'AA100',
    operationType: 'arrival',
    priority: 'high',
    plannedTime: now.toISOString()
  });

  // DL200 departure planned at 12:15, depends on AA100 arrival (linked turnaround)
  await callTool('submit_flight', {
    flightNumber: 'DL200',
    operationType: 'departure',
    priority: 'medium',
    plannedTime: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
    dependencies: ['AA100']
  });

  // UA300 departure planned at 12:20, independent
  await callTool('submit_flight', {
    flightNumber: 'UA300',
    operationType: 'departure',
    priority: 'low',
    plannedTime: new Date(now.getTime() + 20 * 60 * 1000).toISOString()
  });

  // LH400 arrival planned at 12:00, independent
  await callTool('submit_flight', {
    flightNumber: 'LH400',
    operationType: 'arrival',
    priority: 'medium',
    plannedTime: now.toISOString()
  });

  // 2. Inspect Flight Queue Resource (should show all unscheduled)
  console.log('2. VIEWING FLIGHT QUEUE RESOURCE (BEFORE SCHEDULING)...');
  await readResource('flights://queue');

  // 3. Generate Schedule
  console.log('3. GENERATING SCHEDULING TIMELINE...');
  await callTool('generate_schedule');

  // 4. View Scheduled Resources
  console.log('4. INSPECTING SCHEDULING RESOURCES...');
  await readResource('flights://queue');
  await readResource('flights://timeline');
  await readResource('resources://availability');

  // 5. Get Airport Status
  console.log('5. GETTING AIRPORT STATUS...');
  await callTool('get_airport_status');

  // 6. Analyze Bottlenecks
  console.log('6. ANALYZING BOTTLENECK CHAIN...');
  await callTool('analyze_bottlenecks');

  // 7. Cancel flight and see cascade
  console.log('7. CANCELLING AA100 AND EXPECTING DL200 CASCADE...');
  await callTool('cancel_flight', { flightNumber: 'AA100', reason: 'Severe weather delay' });

  // 8. View flight queue again (should see AA100 and DL200 cancelled)
  console.log('8. VIEWING FLIGHT QUEUE RESOURCE (AFTER CANCELLATION)...');
  await readResource('flights://queue');

  // 9. Re-generate schedule without cancelled flights
  console.log('9. RE-GENERATING SCHEDULE POST-CANCELLATION...');
  await callTool('generate_schedule');

  // 10. View timeline after cancellation
  console.log('10. VIEWING TIMELINE AFTER RE-SCHEDULING...');
  await readResource('flights://timeline');

  // Clean disconnect
  console.log('Disconnecting...');
  await client.close();
  console.log('Done!');
}

run().catch((err) => {
  console.error('Test client failed:', err);
  process.exit(1);
});
