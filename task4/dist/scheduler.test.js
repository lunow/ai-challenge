import { test, describe } from 'node:test';
import assert from 'node:assert';
import { scheduleAirport, analyzeBottlenecks, addMinutes } from './scheduler.js';
import { validateConfig } from './config.js';
const mockConfig = {
    runwayCount: 2,
    gateCount: 2,
    groundCrewCount: 2,
    runwayBufferTakeoff: 2,
    runwayBufferLanding: 3,
    runwayBufferMixed: 5,
    gateTurnaroundTime: 45,
    dependencyBufferTime: 15,
    maxSchedulingHorizon: 180, // 3 hours
    groundCrewServiceTime: 30
};
describe('ATC Scheduler & Configuration Tests', () => {
    describe('Configuration Validation', () => {
        test('validateConfig parses correct values', () => {
            // Setup process.env
            process.env.RUNWAY_COUNT = '3';
            process.env.GATE_COUNT = '10';
            process.env.GROUND_CREW_COUNT = '5';
            process.env.RUNWAY_BUFFER_TAKEOFF = '2';
            process.env.RUNWAY_BUFFER_LANDING = '3';
            process.env.RUNWAY_BUFFER_MIXED = '5';
            process.env.GATE_TURNAROUND_TIME = '45';
            process.env.DEPENDENCY_BUFFER_TIME = '15';
            process.env.MAX_SCHEDULING_HORIZON = '1440';
            process.env.GROUND_CREW_SERVICE_TIME = '30';
            const config = validateConfig();
            assert.strictEqual(config.runwayCount, 3);
            assert.strictEqual(config.gateCount, 10);
            assert.strictEqual(config.groundCrewCount, 5);
        });
        test('validateConfig fails on invalid values', () => {
            process.env.RUNWAY_COUNT = '-1';
            assert.throws(() => {
                validateConfig();
            }, /RUNWAY_COUNT must be a positive integer/);
            process.env.RUNWAY_COUNT = 'abc';
            assert.throws(() => {
                validateConfig();
            }, /must be a valid integer/);
        });
    });
    describe('Scheduling Logic', () => {
        test('schedules simple non-conflicting flights', () => {
            const now = new Date('2026-05-23T12:00:00Z');
            const flights = [
                {
                    flightNumber: 'AA101',
                    operationType: 'arrival',
                    priority: 'medium',
                    plannedTime: now.toISOString(),
                    dependencies: [],
                    status: 'unscheduled'
                },
                {
                    flightNumber: 'UA202',
                    operationType: 'departure',
                    priority: 'medium',
                    plannedTime: addMinutes(now, 10).toISOString(),
                    dependencies: [],
                    status: 'unscheduled'
                }
            ];
            const result = scheduleAirport(flights, mockConfig, now);
            assert.strictEqual(result.scheduledFlights.length, 2);
            assert.strictEqual(result.unscheduledFlights.length, 0);
            const f1 = result.scheduledFlights.find(f => f.flightNumber === 'AA101');
            const f2 = result.scheduledFlights.find(f => f.flightNumber === 'UA202');
            assert.strictEqual(f1.status, 'scheduled');
            assert.strictEqual(f2.status, 'scheduled');
            assert.strictEqual(f1.assignedRunway, 'Runway 1');
            // Runway 2 is free so it can schedule immediately at planned time
            assert.strictEqual(f2.scheduledTime, addMinutes(now, 10).toISOString());
        });
        test('respects runway separation buffers (landing-landing)', () => {
            const now = new Date('2026-05-23T12:00:00Z');
            // We have 2 runways. If we schedule 3 arrivals at the exact same time,
            // two can land on Runway 1 and Runway 2 at 12:00.
            // The third one must land on Runway 1 or 2 at 12:03 (due to 3 min landing buffer).
            const flights = [
                {
                    flightNumber: 'FL1',
                    operationType: 'arrival',
                    priority: 'high',
                    plannedTime: now.toISOString(),
                    dependencies: [],
                    status: 'unscheduled'
                },
                {
                    flightNumber: 'FL2',
                    operationType: 'arrival',
                    priority: 'high',
                    plannedTime: now.toISOString(),
                    dependencies: [],
                    status: 'unscheduled'
                },
                {
                    flightNumber: 'FL3',
                    operationType: 'arrival',
                    priority: 'high',
                    plannedTime: now.toISOString(),
                    dependencies: [],
                    status: 'unscheduled'
                }
            ];
            const result = scheduleAirport(flights, { ...mockConfig, gateCount: 3, groundCrewCount: 3 }, now);
            assert.strictEqual(result.scheduledFlights.length, 3);
            const times = result.scheduledFlights.map(f => new Date(f.scheduledTime).getTime()).sort();
            const expectedTimes = [
                now.getTime(),
                now.getTime(),
                addMinutes(now, mockConfig.runwayBufferLanding).getTime()
            ];
            assert.deepStrictEqual(times, expectedTimes);
        });
        test('respects dependencies and buffers', () => {
            const now = new Date('2026-05-23T12:00:00Z');
            // FL2 depends on FL1 (arrival).
            // FL1 lands at 12:00. Dependency buffer is 15 minutes.
            // FL2 is departure, planned at 12:05.
            // FL2 scheduled time must be >= FL1 scheduled time + dependency buffer (12:15)
            // BUT since FL2 depends on FL1, and FL1 is an arrival and FL2 is a departure,
            // if they represent the same aircraft, they share a gate.
            // The turnaround time is 45 minutes, so FL2 takeoff time must be >= FL1 landing time + turnaround time (12:45).
            const flights = [
                {
                    flightNumber: 'FL1',
                    operationType: 'arrival',
                    priority: 'medium',
                    plannedTime: now.toISOString(),
                    dependencies: [],
                    status: 'unscheduled'
                },
                {
                    flightNumber: 'FL2',
                    operationType: 'departure',
                    priority: 'medium',
                    plannedTime: addMinutes(now, 5).toISOString(),
                    dependencies: ['FL1'],
                    status: 'unscheduled'
                }
            ];
            const result = scheduleAirport(flights, mockConfig, now);
            assert.strictEqual(result.scheduledFlights.length, 2);
            const fl1 = result.scheduledFlights.find(f => f.flightNumber === 'FL1');
            const fl2 = result.scheduledFlights.find(f => f.flightNumber === 'FL2');
            assert.strictEqual(fl1.scheduledTime, now.toISOString());
            assert.strictEqual(fl2.scheduledTime, addMinutes(now, mockConfig.gateTurnaroundTime).toISOString());
            assert.strictEqual(fl1.assignedGate, fl2.assignedGate, 'They should share the gate');
        });
        test('handles priority reordering', () => {
            const now = new Date('2026-05-23T12:00:00Z');
            // We submit a low priority flight planned at 12:00 and a high priority flight planned at 12:00.
            // Both are arrivals and there is only 1 runway available (say we set runwayCount = 1).
            const config1Runway = { ...mockConfig, runwayCount: 1 };
            const flights = [
                {
                    flightNumber: 'LOW1',
                    operationType: 'arrival',
                    priority: 'low',
                    plannedTime: now.toISOString(),
                    dependencies: [],
                    status: 'unscheduled'
                },
                {
                    flightNumber: 'HIGH1',
                    operationType: 'arrival',
                    priority: 'high',
                    plannedTime: now.toISOString(),
                    dependencies: [],
                    status: 'unscheduled'
                }
            ];
            const result = scheduleAirport(flights, config1Runway, now);
            const high = result.scheduledFlights.find(f => f.flightNumber === 'HIGH1');
            const low = result.scheduledFlights.find(f => f.flightNumber === 'LOW1');
            // HIGH1 should get 12:00, and LOW1 should get pushed to 12:03 (after landing buffer)
            assert.strictEqual(high.scheduledTime, now.toISOString());
            assert.strictEqual(low.scheduledTime, addMinutes(now, mockConfig.runwayBufferLanding).toISOString());
        });
        test('detects cyclic dependencies', () => {
            const now = new Date('2026-05-23T12:00:00Z');
            const flights = [
                {
                    flightNumber: 'CYC1',
                    operationType: 'arrival',
                    priority: 'medium',
                    plannedTime: now.toISOString(),
                    dependencies: ['CYC2'],
                    status: 'unscheduled'
                },
                {
                    flightNumber: 'CYC2',
                    operationType: 'departure',
                    priority: 'medium',
                    plannedTime: now.toISOString(),
                    dependencies: ['CYC1'],
                    status: 'unscheduled'
                }
            ];
            const result = scheduleAirport(flights, mockConfig, now);
            assert.strictEqual(result.scheduledFlights.length, 0);
            assert.strictEqual(result.unscheduledFlights.length, 2);
            assert.ok(result.unscheduledFlights[0].reason.includes('dependency cycle'));
        });
    });
    describe('Bottleneck Analysis', () => {
        test('correctly identifies critical path of dependencies', () => {
            const now = new Date('2026-05-23T12:00:00Z');
            // F1 -> F2 -> F3
            // F1 landing planned at 12:00.
            // F2 departure (depends on F1), turnaround is 45 mins. So F2 scheduled at 12:45.
            // F3 departure (depends on F2), dependency buffer is 15 mins. So F3 scheduled at 13:00.
            const flights = [
                {
                    flightNumber: 'F1',
                    operationType: 'arrival',
                    priority: 'medium',
                    plannedTime: now.toISOString(),
                    dependencies: [],
                    status: 'unscheduled'
                },
                {
                    flightNumber: 'F2',
                    operationType: 'departure',
                    priority: 'medium',
                    plannedTime: now.toISOString(),
                    dependencies: ['F1'],
                    status: 'unscheduled'
                },
                {
                    flightNumber: 'F3',
                    operationType: 'departure',
                    priority: 'medium',
                    plannedTime: now.toISOString(),
                    dependencies: ['F2'],
                    status: 'unscheduled'
                }
            ];
            const result = scheduleAirport(flights, mockConfig, now);
            const bottleneck = analyzeBottlenecks(result.scheduledFlights, mockConfig);
            assert.strictEqual(bottleneck.flights.length, 3);
            assert.strictEqual(bottleneck.flights[0].flightNumber, 'F1');
            assert.strictEqual(bottleneck.flights[1].flightNumber, 'F2');
            assert.strictEqual(bottleneck.flights[2].flightNumber, 'F3');
            // Delay calculations:
            // F1: 12:00 (planned) -> 12:00 (scheduled) = 0 delay
            // F2: 12:00 (planned) -> 12:45 (scheduled) = 45 delay
            // F3: 12:00 (planned) -> 13:00 (scheduled) = 60 delay
            // Total delay = 0 + 45 + 60 = 105 mins.
            assert.strictEqual(bottleneck.totalDelayMinutes, 105);
        });
    });
    describe('Runway and Gate Constraints', () => {
        test('fails to schedule oversized flight with clear reason', () => {
            const now = new Date('2026-05-23T12:00:00Z');
            const flights = [
                {
                    flightNumber: 'HVY99',
                    operationType: 'departure',
                    priority: 'high',
                    plannedTime: now.toISOString(),
                    dependencies: [],
                    runwayRequirement: 'Runway Long (4000m)',
                    status: 'unscheduled'
                },
                {
                    flightNumber: 'OK101',
                    operationType: 'arrival',
                    priority: 'medium',
                    plannedTime: now.toISOString(),
                    dependencies: [],
                    status: 'unscheduled'
                }
            ];
            const result = scheduleAirport(flights, mockConfig, now);
            // HVY99 should not be scheduled, and should have a clear reason
            const hvy = result.unscheduledFlights.find(uf => uf.flight.flightNumber === 'HVY99');
            assert.ok(hvy);
            assert.strictEqual(hvy.flight.status, 'unscheduled');
            assert.ok(hvy.reason.includes('no suitable runway available matching requirement'));
            assert.ok(hvy.reason.includes('Runway Long (4000m)'));
            // OK101 should be successfully scheduled
            const ok = result.scheduledFlights.find(f => f.flightNumber === 'OK101');
            assert.ok(ok);
            assert.strictEqual(ok.status, 'scheduled');
        });
    });
});
