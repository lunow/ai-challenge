import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { airportConfig } from './config.js';
import { Flight, AirportStatus, TimelineEvent } from './types.js';
import { scheduleAirport, analyzeBottlenecks, addMinutes, diffMinutes, intervalsOverlap } from './scheduler.js';

// In-memory flight queue database
const flights = new Map<string, Flight>();

// Cache of the latest generated schedule
let scheduledFlights: Flight[] = [];
let unscheduledFlights: Array<{ flight: Flight; reason: string }> = [];
let timelineEvents: TimelineEvent[] = [];

// Initialize the MCP Server
const server = new Server(
  {
    name: 'airport-traffic-control-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Register Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'submit_flight',
        description: 'Submit a new flight (arrival or departure) to the pending queue.',
        inputSchema: {
          type: 'object',
          properties: {
            flightNumber: { type: 'string', description: 'Unique flight identifier (e.g. AA123)' },
            operationType: { type: 'string', enum: ['arrival', 'departure'], description: 'Type of operation' },
            priority: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Scheduling priority' },
            plannedTime: { type: 'string', description: 'Planned arrival or departure time in ISO 8601 format (e.g. 2026-05-23T22:00:00Z)' },
            dependencies: { 
              type: 'array', 
              items: { type: 'string' }, 
              description: 'Optional list of flight numbers that this flight depends on (must complete before this one)' 
            },
            runwayRequirement: { type: 'string', description: 'Optional preferred runway (e.g., "Runway 1")' },
            gateRequirement: { type: 'string', description: 'Optional preferred gate (e.g., "Gate 2")' }
          },
          required: ['flightNumber', 'operationType', 'priority', 'plannedTime']
        }
      },
      {
        name: 'generate_schedule',
        description: 'Generates or refreshes the airport schedule. Replaces the current schedule with a freshly computed one based on the current queue and airport configuration.',
        inputSchema: {
          type: 'object',
          properties: {
            simulatedTime: { type: 'string', description: 'Optional simulated current time to schedule relative to.' }
          }
        }
      },
      {
        name: 'get_airport_status',
        description: 'Get current airport status, including active resource occupancy and flight counts.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'cancel_flight',
        description: 'Cancel a flight and recursively cancel any other flights that depend on it.',
        inputSchema: {
          type: 'object',
          properties: {
            flightNumber: { type: 'string', description: 'Flight number of the flight to cancel' },
            reason: { type: 'string', description: 'Optional cancellation reason' }
          },
          required: ['flightNumber']
        }
      },
      {
        name: 'analyze_bottlenecks',
        description: 'Perform bottleneck analysis to identify the critical path sequence of dependent flights that drives the total schedule duration.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'reset_airport',
        description: 'Resets the airport flight queue and schedule database to a clean, empty state.',
        inputSchema: { type: 'object', properties: {} }
      }
    ]
  };
});

// Handle Tool Executions
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'submit_flight': {
        const { flightNumber, operationType, priority, plannedTime, dependencies, runwayRequirement, gateRequirement } = args as any;

        if (flights.has(flightNumber)) {
          return {
            content: [{ type: 'text', text: `Error: Flight ${flightNumber} already exists in the queue.` }],
            isError: true
          };
        }

        // Validate plannedTime
        const parsedTime = Date.parse(plannedTime);
        if (isNaN(parsedTime)) {
          return {
            content: [{ type: 'text', text: `Error: Invalid plannedTime format. Must be a valid ISO 8601 string.` }],
            isError: true
          };
        }

        const deps = dependencies || [];

        const newFlight: Flight = {
          flightNumber,
          operationType,
          priority,
          plannedTime: new Date(parsedTime).toISOString(),
          dependencies: deps,
          runwayRequirement,
          gateRequirement,
          status: 'unscheduled'
        };

        flights.set(flightNumber, newFlight);
        return {
          content: [{ 
            type: 'text', 
            text: `Flight ${flightNumber} submitted successfully as ${operationType}.\n` +
                 `Priority: ${priority}\n` +
                 `Planned Time: ${newFlight.plannedTime}\n` +
                 `Dependencies: ${deps.join(', ') || 'None'}\n` +
                 `Note: Run generate_schedule to compute the new schedule.`
          }]
        };
      }

      case 'generate_schedule': {
        const { simulatedTime } = args as any;
        const now = simulatedTime ? new Date(simulatedTime) : new Date();
        const queue = Array.from(flights.values());
        const result = scheduleAirport(queue, airportConfig, now);
        
        // Update flight statuses in our DB to match the schedule
        for (const sf of result.scheduledFlights) {
          flights.set(sf.flightNumber, sf);
        }
        for (const uf of result.unscheduledFlights) {
          flights.set(uf.flight.flightNumber, { ...uf.flight, status: 'unscheduled', cancellationReason: uf.reason });
        }

        scheduledFlights = result.scheduledFlights;
        unscheduledFlights = result.unscheduledFlights;
        timelineEvents = result.timeline;

        const summary = `Airport schedule refreshed successfully.\n` +
                        `- Scheduled flights: ${scheduledFlights.length}\n` +
                        `- Unscheduled/Failed flights: ${unscheduledFlights.length}\n` +
                        `- Total timeline events generated: ${timelineEvents.length}`;

        return {
          content: [{ type: 'text', text: summary }]
        };
      }

      case 'get_airport_status': {
        const queue = Array.from(flights.values());
        const { simulatedTime } = args as any;
        const now = simulatedTime ? new Date(simulatedTime) : new Date();

        // 1. Flight Counts by state and operation type
        let unscheduled = 0;
        let scheduled = 0;
        let cancelled = 0;
        
        let arrTotal = 0;
        let arrUnscheduled = 0;
        let arrScheduled = 0;
        let arrCancelled = 0;

        let depTotal = 0;
        let depUnscheduled = 0;
        let depScheduled = 0;
        let depCancelled = 0;

        for (const f of queue) {
          if (f.status === 'scheduled') {
            scheduled++;
            if (f.operationType === 'arrival') arrScheduled++;
            else depScheduled++;
          } else if (f.status === 'cancelled') {
            cancelled++;
            if (f.operationType === 'arrival') arrCancelled++;
            else depCancelled++;
          } else {
            unscheduled++;
            if (f.operationType === 'arrival') arrUnscheduled++;
            else depUnscheduled++;
          }

          if (f.operationType === 'arrival') arrTotal++;
          else depTotal++;
        }

        // 2. Capacity/usage counts
        let occupiedGates = 0;
        const activeGateAssignments: string[] = [];
        let occupiedRunways = 0;
        const activeRunwayAssignments: string[] = [];
        let activeGroundCrew = 0;

        for (const f of scheduledFlights) {
          if (!f.scheduledTime || !f.assignedGate || !f.assignedRunway) continue;

          const tSched = new Date(f.scheduledTime);

          // Gate occupancy
          let gateStart: Date;
          let gateEnd: Date;
          if (f.operationType === 'arrival') {
            gateStart = tSched;
            gateEnd = addMinutes(tSched, airportConfig.gateTurnaroundTime);
          } else {
            // departure
            let linkedArrival: Flight | undefined;
            for (const depNum of f.dependencies) {
              const depFlight = flights.get(depNum);
              if (depFlight && depFlight.operationType === 'arrival' && depFlight.assignedGate === f.assignedGate) {
                linkedArrival = depFlight;
                break;
              }
            }

            if (linkedArrival && linkedArrival.scheduledTime) {
              gateStart = new Date(linkedArrival.scheduledTime);
              gateEnd = tSched;
            } else {
              gateStart = addMinutes(tSched, -airportConfig.gateTurnaroundTime);
              gateEnd = tSched;
            }
          }

          if (now >= gateStart && now < gateEnd) {
            occupiedGates++;
            activeGateAssignments.push(`${f.assignedGate} (${f.flightNumber})`);
          }

          // Runway occupancy
          const runwayBuffer = f.operationType === 'arrival' 
            ? airportConfig.runwayBufferLanding 
            : airportConfig.runwayBufferTakeoff;
          
          if (now >= tSched && now < addMinutes(tSched, runwayBuffer)) {
            occupiedRunways++;
            activeRunwayAssignments.push(`${f.assignedRunway} (${f.flightNumber})`);
          }
        }

        // Active ground crew
        const crewIntervals: Array<{ start: Date; end: Date }> = [];
        for (const f of scheduledFlights) {
          if (!f.scheduledTime) continue;
          const tSched = new Date(f.scheduledTime);
          const start = f.operationType === 'arrival' ? tSched : addMinutes(tSched, -airportConfig.groundCrewServiceTime);
          const end = f.operationType === 'arrival' ? addMinutes(tSched, airportConfig.groundCrewServiceTime) : tSched;
          if (now >= start && now < end) {
            crewIntervals.push({ start, end });
          }
        }
        activeGroundCrew = Math.min(crewIntervals.length, airportConfig.groundCrewCount);

        // 3. Congestion / Resource Constraint Indicators (congested if >= 80% capacity is occupied)
        const gatesCongested = occupiedGates / airportConfig.gateCount >= 0.8;
        const runwaysCongested = occupiedRunways / airportConfig.runwayCount >= 0.8;
        const crewsCongested = activeGroundCrew / airportConfig.groundCrewCount >= 0.8;

        // 4. Blocked/Unscheduled flights with reasons
        const blockedFlightsList = [];
        for (const f of queue) {
          if (f.status === 'unscheduled') {
            const cached = unscheduledFlights.find(uf => uf.flight.flightNumber === f.flightNumber);
            blockedFlightsList.push({
              flightNumber: f.flightNumber,
              operationType: f.operationType,
              plannedTime: f.plannedTime,
              reason: cached ? cached.reason : 'Pending initial scheduling. Run generate_schedule.'
            });
          }
        }

        // 5. Schedule Completion Time (latest end time)
        let maxEndTime: Date | undefined;
        for (const sf of scheduledFlights) {
          if (!sf.scheduledTime) continue;
          const start = new Date(sf.scheduledTime);
          const end = sf.operationType === 'arrival'
            ? addMinutes(start, airportConfig.gateTurnaroundTime)
            : start;
          if (!maxEndTime || end > maxEndTime) {
            maxEndTime = end;
          }
        }
        const scheduleCompletionTime = maxEndTime ? maxEndTime.toISOString() : undefined;

        const statusResponse: AirportStatus = {
          flightCounts: {
            total: queue.length,
            unscheduled,
            scheduled,
            cancelled,
            arrivals: {
              total: arrTotal,
              unscheduled: arrUnscheduled,
              scheduled: arrScheduled,
              cancelled: arrCancelled
            },
            departures: {
              total: depTotal,
              unscheduled: depUnscheduled,
              scheduled: depScheduled,
              cancelled: depCancelled
            }
          },
          activeResourceUsage: {
            occupiedGates,
            totalGates: airportConfig.gateCount,
            occupiedRunways,
            totalRunways: airportConfig.runwayCount,
            activeGroundCrew,
            totalGroundCrew: airportConfig.groundCrewCount
          },
          resourceConstraintIndicators: {
            gatesCongested,
            runwaysCongested,
            crewsCongested
          },
          blockedFlights: blockedFlightsList,
          scheduleCompletionTime
        };

        let formattedText = `Airport Status Summary (Current Time: ${now.toISOString()})\n\n` +
          `Flight Counts:\n` +
          ` - Total Flights in Queue: ${statusResponse.flightCounts.total}\n` +
          ` - Scheduled: ${statusResponse.flightCounts.scheduled} (Arrivals: ${statusResponse.flightCounts.arrivals.scheduled}, Departures: ${statusResponse.flightCounts.departures.scheduled})\n` +
          ` - Unscheduled: ${statusResponse.flightCounts.unscheduled} (Arrivals: ${statusResponse.flightCounts.arrivals.unscheduled}, Departures: ${statusResponse.flightCounts.departures.unscheduled})\n` +
          ` - Cancelled: ${statusResponse.flightCounts.cancelled} (Arrivals: ${statusResponse.flightCounts.arrivals.cancelled}, Departures: ${statusResponse.flightCounts.departures.cancelled})\n\n` +
          `Active Resource Usage:\n` +
          ` - Gates: ${statusResponse.activeResourceUsage.occupiedGates}/${statusResponse.activeResourceUsage.totalGates} occupied ${gatesCongested ? `[CONGESTED]` : ''}\n` +
          `   ${activeGateAssignments.length > 0 ? `Active gates: ${activeGateAssignments.join(', ')}` : 'No active gate operations.'}\n` +
          ` - Runways: ${statusResponse.activeResourceUsage.occupiedRunways}/${statusResponse.activeResourceUsage.totalRunways} occupied ${runwaysCongested ? `[CONGESTED]` : ''}\n` +
          `   ${activeRunwayAssignments.length > 0 ? `Active runways: ${activeRunwayAssignments.join(', ')}` : 'No active runway operations.'}\n` +
          ` - Ground Crew: ${statusResponse.activeResourceUsage.activeGroundCrew}/${statusResponse.activeResourceUsage.totalGroundCrew} working ${crewsCongested ? `[CONGESTED]` : ''}\n` +
          `Schedule Completion: ${scheduleCompletionTime ? new Date(scheduleCompletionTime).toLocaleString() : 'N/A'}\n\n`;

        if (blockedFlightsList.length > 0) {
          formattedText += `Blocked/Unscheduled Flights:\n`;
          for (const bf of blockedFlightsList) {
            formattedText += ` - ${bf.flightNumber} (${bf.operationType}, Planned: ${bf.plannedTime}): ${bf.reason}\n`;
          }
        } else {
          formattedText += `No blocked or unscheduled flights in the queue.\n`;
        }

        return {
          content: [{ type: 'text', text: formattedText }]
        };
      }

      case 'cancel_flight': {
        const { flightNumber, reason = 'Cancelled by air traffic control' } = args as any;

        if (!flights.has(flightNumber)) {
          return {
            content: [{ type: 'text', text: `Error: Flight ${flightNumber} not found in the queue.` }],
            isError: true
          };
        }

        const cancelledFlights: string[] = [];
        const cancelQueue = [flightNumber];

        while (cancelQueue.length > 0) {
          const currentNum = cancelQueue.shift()!;
          const flight = flights.get(currentNum);
          if (flight && flight.status !== 'cancelled') {
            flight.status = 'cancelled';
            flight.cancellationReason = currentNum === flightNumber 
              ? reason 
              : `Cancelled: dependency flight ${flightNumber} was cancelled.`;
            
            // Remove scheduling details
            delete flight.scheduledTime;
            delete flight.assignedRunway;
            delete flight.assignedGate;
            
            cancelledFlights.push(currentNum);

            // Find all children that depend on this flight and add to cancellation queue
            for (const f of flights.values()) {
              if (f.dependencies.includes(currentNum) && f.status !== 'cancelled') {
                cancelQueue.push(f.flightNumber);
              }
            }
          }
        }

        return {
          content: [{
            type: 'text',
            text: `Flight ${flightNumber} and its dependent flights have been cancelled.\n` +
                 `Total cancelled flights: ${cancelledFlights.length}\n` +
                 `Cancelled flights: ${cancelledFlights.join(', ')}\n` +
                 `Note: Run generate_schedule to recalculate a safe schedule for remaining active flights.`
          }]
        };
      }

      case 'analyze_bottlenecks': {
        if (scheduledFlights.length === 0) {
          return {
            content: [{ type: 'text', text: 'No scheduled flights. Run generate_schedule first to analyze bottlenecks.' }]
          };
        }

        const bottleneck = analyzeBottlenecks(scheduledFlights, airportConfig);
        if (bottleneck.flights.length === 0) {
          return {
            content: [{ type: 'text', text: 'No bottleneck path found.' }]
          };
        }

        let pathText = `Bottleneck Chain (Critical Path):\n`;
        bottleneck.flights.forEach((f, idx) => {
          const delayStr = f.scheduledTime 
            ? `${Math.round(diffMinutes(new Date(f.scheduledTime), new Date(f.plannedTime)))} min delay`
            : 'not scheduled';
          pathText += `${idx + 1}. Flight ${f.flightNumber} (${f.operationType}, Priority: ${f.priority})` +
                     ` - Planned: ${f.plannedTime}, Scheduled: ${f.scheduledTime} [${delayStr}]\n`;
        });
        pathText += `\nTotal Delay in Chain: ${Math.round(bottleneck.totalDelayMinutes)} minutes.`;

        return {
          content: [{ type: 'text', text: pathText }]
        };
      }

      case 'reset_airport': {
        flights.clear();
        scheduledFlights = [];
        unscheduledFlights = [];
        timelineEvents = [];
        return {
          content: [{ type: 'text', text: 'Airport state reset successful. All flights cleared from the queue.' }]
        };
      }

      default:
        throw new Error(`Tool not found: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true
    };
  }
});

// Register Resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'flights://queue',
        name: 'Flight Queue',
        description: 'The complete flight queue, including unscheduled, scheduled, and cancelled flights.',
        mimeType: 'application/json'
      },
      {
        uri: 'resources://availability',
        name: 'Resource Availability and Usage',
        description: 'Detailed usage and reservations of runways, gates, and ground crews.',
        mimeType: 'application/json'
      },
      {
        uri: 'flights://timeline',
        name: 'Scheduled Operations Timeline',
        description: 'A chronological timeline of scheduled runway and gate operations.',
        mimeType: 'application/json'
      }
    ]
  };
});

// Handle Resource Reads
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  try {
    if (uri === 'flights://queue') {
      const queue = Array.from(flights.values());
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(queue, null, 2)
          }
        ]
      };
    }

    if (uri === 'resources://availability') {
      const runwayDetails: Record<string, any> = {};
      for (let i = 1; i <= airportConfig.runwayCount; i++) {
        runwayDetails[`Runway ${i}`] = [];
      }
      const gateDetails: Record<string, any> = {};
      for (let i = 1; i <= airportConfig.gateCount; i++) {
        gateDetails[`Gate ${i}`] = [];
      }
      const crewDetails: Record<string, any> = {};
      for (let i = 1; i <= airportConfig.groundCrewCount; i++) {
        crewDetails[`Crew ${i}`] = [];
      }

      for (const f of scheduledFlights) {
        if (!f.scheduledTime) continue;
        const tSched = new Date(f.scheduledTime);

        if (f.assignedRunway) {
          runwayDetails[f.assignedRunway].push({
            flightNumber: f.flightNumber,
            operationType: f.operationType,
            scheduledTime: f.scheduledTime
          });
        }

        if (f.assignedGate) {
          let gateStart: Date;
          let gateEnd: Date;
          if (f.operationType === 'arrival') {
            gateStart = tSched;
            gateEnd = addMinutes(tSched, airportConfig.gateTurnaroundTime);
          } else {
            // departure
            let linkedArrival: Flight | undefined;
            for (const depNum of f.dependencies) {
              const depFlight = flights.get(depNum);
              if (depFlight && depFlight.operationType === 'arrival' && depFlight.assignedGate === f.assignedGate) {
                linkedArrival = depFlight;
                break;
              }
            }

            if (linkedArrival && linkedArrival.scheduledTime) {
              gateStart = new Date(linkedArrival.scheduledTime);
              gateEnd = tSched;
            } else {
              gateStart = addMinutes(tSched, -airportConfig.gateTurnaroundTime);
              gateEnd = tSched;
            }
          }

          gateDetails[f.assignedGate].push({
            flightNumber: f.flightNumber,
            occupiedFrom: gateStart.toISOString(),
            occupiedTo: gateEnd.toISOString()
          });
        }
      }

      // Re-assign crews deterministically for representation in resources
      const crewReservations = new Map<number, Array<{ start: Date; end: Date; flightNumber: string }>>();
      for (let i = 1; i <= airportConfig.groundCrewCount; i++) {
        crewReservations.set(i, []);
      }

      for (const f of scheduledFlights) {
        if (!f.scheduledTime) continue;
        const tSched = new Date(f.scheduledTime);
        const crewStart = f.operationType === 'arrival' ? tSched : addMinutes(tSched, -airportConfig.groundCrewServiceTime);
        const crewEnd = f.operationType === 'arrival' ? addMinutes(tSched, airportConfig.groundCrewServiceTime) : tSched;

        for (let i = 1; i <= airportConfig.groundCrewCount; i++) {
          const reservations = crewReservations.get(i) || [];
          const hasConflict = reservations.some((res) => {
            return intervalsOverlap(crewStart, crewEnd, res.start, res.end);
          });
          if (!hasConflict) {
            reservations.push({ start: crewStart, end: crewEnd, flightNumber: f.flightNumber });
            crewDetails[`Crew ${i}`].push({
              flightNumber: f.flightNumber,
              busyFrom: crewStart.toISOString(),
              busyTo: crewEnd.toISOString()
            });
            break;
          }
        }
      }

      const resourceAvailability = {
        runways: runwayDetails,
        gates: gateDetails,
        groundCrews: crewDetails
      };

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(resourceAvailability, null, 2)
          }
        ]
      };
    }

    if (uri === 'flights://timeline') {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(timelineEvents, null, 2)
          }
        ]
      };
    }

    throw new Error(`Resource not found: ${uri}`);
  } catch (error: any) {
    throw new Error(`Failed to read resource: ${error.message}`);
  }
});

// Run server using StdioServerTransport
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Air Traffic Control MCP Server running on stdio');
}

run().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
});
