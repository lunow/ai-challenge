// Helper: Add minutes to a Date object
export function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60 * 1000);
}
// Helper: Get difference in minutes between two dates
export function diffMinutes(d1, d2) {
    return (d1.getTime() - d2.getTime()) / (60 * 1000);
}
// Helper: Check if two intervals overlap
export function intervalsOverlap(s1, e1, s2, e2) {
    return s1 < e2 && s2 < e1;
}
// Helper: Get runway separation buffer
function getRunwayBuffer(op1, op2, config) {
    if (op1 === op2) {
        return op1 === 'arrival' ? config.runwayBufferLanding : config.runwayBufferTakeoff;
    }
    return config.runwayBufferMixed;
}
export function generateTimeline(scheduledFlights, config) {
    const events = [];
    for (const f of scheduledFlights) {
        if (!f.scheduledTime || !f.assignedRunway || !f.assignedGate)
            continue;
        const tScheduled = new Date(f.scheduledTime);
        if (f.operationType === 'arrival') {
            // Runway Landing
            events.push({
                time: f.scheduledTime,
                type: 'landing',
                flightNumber: f.flightNumber,
                details: `Flight ${f.flightNumber} landed on ${f.assignedRunway}.`
            });
            // Gate Entry
            events.push({
                time: f.scheduledTime,
                type: 'gate_entry',
                flightNumber: f.flightNumber,
                details: `Flight ${f.flightNumber} entered ${f.assignedGate} for turnaround.`
            });
            // Ground Crew Assignment
            events.push({
                time: f.scheduledTime,
                type: 'crew_assigned',
                flightNumber: f.flightNumber,
                details: `Ground crew assigned to Flight ${f.flightNumber} for unloading.`
            });
            // Ground Crew Release
            const tCrewReleased = addMinutes(tScheduled, config.groundCrewServiceTime);
            events.push({
                time: tCrewReleased.toISOString(),
                type: 'crew_released',
                flightNumber: f.flightNumber,
                details: `Ground crew released from Flight ${f.flightNumber}.`
            });
            // Gate Exit
            const tGateExit = addMinutes(tScheduled, config.gateTurnaroundTime);
            events.push({
                time: tGateExit.toISOString(),
                type: 'gate_exit',
                flightNumber: f.flightNumber,
                details: `Flight ${f.flightNumber} completed turnaround and exited ${f.assignedGate}.`
            });
        }
        else {
            // Departure
            const tCrewAssigned = addMinutes(tScheduled, -config.groundCrewServiceTime);
            const tGateEntry = addMinutes(tScheduled, -config.gateTurnaroundTime);
            // Gate Entry
            events.push({
                time: tGateEntry.toISOString(),
                type: 'gate_entry',
                flightNumber: f.flightNumber,
                details: `Flight ${f.flightNumber} towed to departure ${f.assignedGate} for preparation.`
            });
            // Ground Crew Assignment
            events.push({
                time: tCrewAssigned.toISOString(),
                type: 'crew_assigned',
                flightNumber: f.flightNumber,
                details: `Ground crew assigned to Flight ${f.flightNumber} for departure prep.`
            });
            // Ground Crew Release
            events.push({
                time: f.scheduledTime,
                type: 'crew_released',
                flightNumber: f.flightNumber,
                details: `Ground crew released after Flight ${f.flightNumber} pushback.`
            });
            // Runway Takeoff
            events.push({
                time: f.scheduledTime,
                type: 'takeoff',
                flightNumber: f.flightNumber,
                details: `Flight ${f.flightNumber} took off from ${f.assignedRunway}.`
            });
            // Gate Exit
            events.push({
                time: f.scheduledTime,
                type: 'gate_exit',
                flightNumber: f.flightNumber,
                details: `Flight ${f.flightNumber} departed and cleared ${f.assignedGate}.`
            });
        }
    }
    // Sort timeline events chronologically
    return events.sort((a, b) => {
        const timeCompare = new Date(a.time).getTime() - new Date(b.time).getTime();
        if (timeCompare !== 0)
            return timeCompare;
        // Tie-breaker for same time events
        const order = {
            landing: 1,
            gate_entry: 2,
            crew_assigned: 3,
            crew_released: 4,
            gate_exit: 5,
            takeoff: 6
        };
        return (order[a.type] || 0) - (order[b.type] || 0);
    });
}
export function scheduleAirport(flightsQueue, config, currentTime = new Date()) {
    const scheduledFlights = [];
    const unscheduledFlights = [];
    // Filter out cancelled flights
    const activeFlights = flightsQueue.filter((f) => f.status !== 'cancelled');
    // Track resource usage
    // We use lists of intervals assigned to each resource
    const runwayReservations = new Map();
    for (let i = 1; i <= config.runwayCount; i++) {
        runwayReservations.set(`Runway ${i}`, []);
    }
    const gateReservations = new Map();
    for (let i = 1; i <= config.gateCount; i++) {
        gateReservations.set(`Gate ${i}`, []);
    }
    const crewReservations = new Map();
    for (let i = 1; i <= config.groundCrewCount; i++) {
        crewReservations.set(i, []);
    }
    // Define scheduling horizon
    const earliestPlannedTime = activeFlights.reduce((earliest, f) => {
        const planned = new Date(f.plannedTime);
        return planned < earliest ? planned : earliest;
    }, currentTime);
    const horizonStart = currentTime < earliestPlannedTime ? currentTime : earliestPlannedTime;
    const horizonEnd = addMinutes(horizonStart, config.maxSchedulingHorizon);
    // We schedule using a greedy topological sort to satisfy dependencies and priority.
    const remaining = [...activeFlights];
    const flightMap = new Map();
    for (const f of flightsQueue) {
        flightMap.set(f.flightNumber, f);
    }
    // Helper to check if a flight has cycle or invalid dependencies
    const hasCycle = (flightNum, visited, stack) => {
        if (stack.has(flightNum))
            return true;
        if (visited.has(flightNum))
            return false;
        visited.add(flightNum);
        stack.add(flightNum);
        const fl = flightMap.get(flightNum);
        if (fl) {
            for (const dep of fl.dependencies) {
                if (hasCycle(dep, visited, stack))
                    return true;
            }
        }
        stack.delete(flightNum);
        return false;
    };
    // Detect and handle cyclic/invalid dependencies upfront
    const cyclicFlightNumbers = new Set();
    for (const f of remaining) {
        if (hasCycle(f.flightNumber, new Set(), new Set())) {
            cyclicFlightNumbers.add(f.flightNumber);
        }
    }
    // Mark cyclic flights as unschedulable
    for (let i = remaining.length - 1; i >= 0; i--) {
        const f = remaining[i];
        if (cyclicFlightNumbers.has(f.flightNumber)) {
            unscheduledFlights.push({
                flight: { ...f, status: 'unscheduled' },
                reason: 'Unschedulable: flight belongs to a dependency cycle'
            });
            remaining.splice(i, 1);
        }
    }
    // Map to store scheduled times for dependency resolution
    const scheduledTimeMap = new Map();
    // Process remaining flights greedily based on ready state, priority and planned time
    while (remaining.length > 0) {
        // 1. Find all "ready" flights (all dependencies are already scheduled successfully)
        const ready = remaining.filter((f) => {
            return f.dependencies.every((depNum) => scheduledTimeMap.has(depNum));
        });
        if (ready.length === 0) {
            // If we have remaining flights but none are ready, it means some dependencies are missing/unscheduled
            // Mark all remaining as unschedulable due to missing dependencies
            for (const f of remaining) {
                const missingDeps = f.dependencies.filter((dep) => !scheduledTimeMap.has(dep));
                unscheduledFlights.push({
                    flight: { ...f, status: 'unscheduled' },
                    reason: `Unschedulable: missing or unscheduled dependencies (${missingDeps.join(', ')})`
                });
            }
            break;
        }
        // 2. Select the next flight based on Priority and Planned Time
        ready.sort((a, b) => {
            // Priority sorting: High > Medium > Low
            const pOrder = { high: 3, medium: 2, low: 1 };
            const pDiff = pOrder[b.priority] - pOrder[a.priority];
            if (pDiff !== 0)
                return pDiff;
            // Planned Time sorting
            const timeDiff = new Date(a.plannedTime).getTime() - new Date(b.plannedTime).getTime();
            if (timeDiff !== 0)
                return timeDiff;
            // Deterministic tie-breaker
            return a.flightNumber.localeCompare(b.flightNumber);
        });
        const flight = ready[0];
        const indexInRemaining = remaining.findIndex((r) => r.flightNumber === flight.flightNumber);
        remaining.splice(indexInRemaining, 1);
        // 3. Determine earliest allowed scheduled time based on dependencies
        let tMin = new Date(flight.plannedTime);
        if (tMin < horizonStart) {
            tMin = horizonStart;
        }
        for (const depNum of flight.dependencies) {
            const depTime = scheduledTimeMap.get(depNum);
            if (depTime) {
                const earliestAfterDep = addMinutes(depTime, config.dependencyBufferTime);
                if (earliestAfterDep > tMin) {
                    tMin = earliestAfterDep;
                }
                // Also check if dependency is an arrival and current flight is a departure,
                // and we want to allow at least GATE_TURNAROUND_TIME for aircraft prep if linked
                const depFlight = flightMap.get(depNum);
                if (depFlight && depFlight.operationType === 'arrival' && flight.operationType === 'departure') {
                    const earliestAfterTurnaround = addMinutes(depTime, config.gateTurnaroundTime);
                    if (earliestAfterTurnaround > tMin) {
                        tMin = earliestAfterTurnaround;
                    }
                }
            }
        }
        // Validate runway requirement
        if (flight.runwayRequirement && !runwayReservations.has(flight.runwayRequirement)) {
            unscheduledFlights.push({
                flight: { ...flight, status: 'unscheduled' },
                reason: `Unschedulable: no suitable runway available matching requirement "${flight.runwayRequirement}"`
            });
            continue;
        }
        // Validate gate requirement
        if (flight.gateRequirement && !gateReservations.has(flight.gateRequirement)) {
            unscheduledFlights.push({
                flight: { ...flight, status: 'unscheduled' },
                reason: `Unschedulable: no suitable gate available matching requirement "${flight.gateRequirement}"`
            });
            continue;
        }
        // 4. Search for the earliest time t >= tMin with available resources
        let scheduled = false;
        let tSearch = new Date(tMin);
        while (tSearch <= horizonEnd) {
            // A. Check Runway availability
            let selectedRunway;
            const runwaysToCheck = flight.runwayRequirement
                ? [flight.runwayRequirement]
                : Array.from(runwayReservations.keys());
            for (const rwId of runwaysToCheck) {
                const reservations = runwayReservations.get(rwId) || [];
                // Check if there is any runway buffer conflict
                const hasConflict = reservations.some((res) => {
                    const buffer = getRunwayBuffer(flight.operationType, res.opType, config);
                    const diff = Math.abs(diffMinutes(tSearch, res.time));
                    return diff < buffer;
                });
                if (!hasConflict) {
                    selectedRunway = rwId;
                    break;
                }
            }
            if (!selectedRunway) {
                // No runway available at tSearch, advance time and try again
                tSearch = addMinutes(tSearch, 1);
                continue;
            }
            // B. Determine Gate occupancy interval for this candidate time
            // Check if we can link departure gate with arrival dependency
            let linkedArrivalDep;
            if (flight.operationType === 'departure') {
                for (const depNum of flight.dependencies) {
                    const depFlight = flightMap.get(depNum);
                    if (depFlight && depFlight.operationType === 'arrival' && depFlight.assignedGate) {
                        linkedArrivalDep = depFlight;
                        break; // take the first arrival dependency gate
                    }
                }
            }
            let gateStart;
            let gateEnd;
            if (flight.operationType === 'arrival') {
                gateStart = tSearch;
                gateEnd = addMinutes(tSearch, config.gateTurnaroundTime);
            }
            else {
                // departure
                if (linkedArrivalDep && linkedArrivalDep.scheduledTime) {
                    // Linked gate occupancy starts from the arrival landing time and ends at departure takeoff time
                    gateStart = new Date(linkedArrivalDep.scheduledTime);
                    gateEnd = tSearch;
                }
                else {
                    gateStart = addMinutes(tSearch, -config.gateTurnaroundTime);
                    gateEnd = tSearch;
                }
            }
            let selectedGate;
            const gatesToCheck = flight.gateRequirement
                ? [flight.gateRequirement]
                : (linkedArrivalDep && linkedArrivalDep.assignedGate
                    ? [linkedArrivalDep.assignedGate]
                    : Array.from(gateReservations.keys()));
            for (const gateId of gatesToCheck) {
                const reservations = gateReservations.get(gateId) || [];
                // A conflict occurs if another flight occupies the gate during (gateStart, gateEnd)
                // Note: if linkedArrivalDep is using this gate, we ignore conflicts with linkedArrivalDep itself,
                // because we are sharing the gate.
                const hasConflict = reservations.some((res) => {
                    if (linkedArrivalDep && res.flightNumber === linkedArrivalDep.flightNumber) {
                        return false; // Sharing gate is allowed
                    }
                    return intervalsOverlap(gateStart, gateEnd, res.start, res.end);
                });
                if (!hasConflict) {
                    selectedGate = gateId;
                    break;
                }
            }
            if (!selectedGate) {
                // No gate available at tSearch, advance time and try again
                tSearch = addMinutes(tSearch, 1);
                continue;
            }
            // C. Check Ground Crew availability
            let crewStart;
            let crewEnd;
            if (flight.operationType === 'arrival') {
                crewStart = tSearch;
                crewEnd = addMinutes(tSearch, config.groundCrewServiceTime);
            }
            else {
                crewStart = addMinutes(tSearch, -config.groundCrewServiceTime);
                crewEnd = tSearch;
            }
            let selectedCrewId;
            for (const [crewId, reservations] of crewReservations.entries()) {
                const hasConflict = reservations.some((res) => {
                    return intervalsOverlap(crewStart, crewEnd, res.start, res.end);
                });
                if (!hasConflict) {
                    selectedCrewId = crewId;
                    break;
                }
            }
            if (!selectedCrewId) {
                // No ground crew available at tSearch, advance time and try again
                tSearch = addMinutes(tSearch, 1);
                continue;
            }
            // If all resources are secured, reserve them!
            runwayReservations.get(selectedRunway).push({
                flightNumber: flight.flightNumber,
                opType: flight.operationType,
                time: tSearch
            });
            gateReservations.get(selectedGate).push({
                flightNumber: flight.flightNumber,
                start: gateStart,
                end: gateEnd
            });
            // Update linked arrival's gate end reservation if linked, to extend it to departure time
            if (linkedArrivalDep && linkedArrivalDep.assignedGate) {
                const arrReservations = gateReservations.get(linkedArrivalDep.assignedGate) || [];
                const resIdx = arrReservations.findIndex(r => r.flightNumber === linkedArrivalDep.flightNumber);
                if (resIdx !== -1) {
                    arrReservations[resIdx].end = tSearch; // Extend to departure time
                }
            }
            crewReservations.get(selectedCrewId).push({
                flightNumber: flight.flightNumber,
                start: crewStart,
                end: crewEnd
            });
            // Record scheduled flight
            const scheduledFlight = {
                ...flight,
                status: 'scheduled',
                scheduledTime: tSearch.toISOString(),
                assignedRunway: selectedRunway,
                assignedGate: selectedGate
            };
            scheduledFlights.push(scheduledFlight);
            scheduledTimeMap.set(flight.flightNumber, tSearch);
            flightMap.set(flight.flightNumber, scheduledFlight);
            scheduled = true;
            break;
        }
        if (!scheduled) {
            unscheduledFlights.push({
                flight: { ...flight, status: 'unscheduled' },
                reason: 'Unschedulable: resource capacity exhausted within maximum scheduling horizon'
            });
        }
    }
    // Generate chronological timeline
    const timeline = generateTimeline(scheduledFlights, config);
    return {
        scheduledFlights,
        unscheduledFlights,
        timeline
    };
}
/**
 * Traces the dependency bottleneck chain (critical path).
 * Starts at the flight that finishes last, and traces back through the dependencies
 * that constrained its scheduled time.
 */
export function analyzeBottlenecks(scheduledFlights, config) {
    if (scheduledFlights.length === 0) {
        return { flights: [], totalDelayMinutes: 0 };
    }
    // Helper: Get end time of a scheduled flight (for arrival, after gate turnaround; for departure, after takeoff)
    const getEndTime = (f) => {
        if (!f.scheduledTime)
            return new Date(0);
        const start = new Date(f.scheduledTime);
        return f.operationType === 'arrival'
            ? addMinutes(start, config.gateTurnaroundTime)
            : start;
    };
    // 1. Find the flight that completes last
    let latestFlight = scheduledFlights[0];
    let latestEndTime = getEndTime(latestFlight);
    for (const f of scheduledFlights) {
        const end = getEndTime(f);
        if (end > latestEndTime) {
            latestEndTime = end;
            latestFlight = f;
        }
    }
    // Map for quick lookups
    const scheduledMap = new Map();
    for (const f of scheduledFlights) {
        scheduledMap.set(f.flightNumber, f);
    }
    // 2. Trace back dependencies
    const path = [latestFlight];
    let current = latestFlight;
    while (current.dependencies.length > 0) {
        let bottleneckDep;
        let maxConstraintTime = new Date(0);
        for (const depNum of current.dependencies) {
            const depFlight = scheduledMap.get(depNum);
            if (!depFlight || !depFlight.scheduledTime)
                continue;
            const depScheduled = new Date(depFlight.scheduledTime);
            let constraintTime = addMinutes(depScheduled, config.dependencyBufferTime);
            // Check if linked same-gate turnaround constraint applies
            if (depFlight.operationType === 'arrival' && current.operationType === 'departure') {
                const turnaroundConstraint = addMinutes(depScheduled, config.gateTurnaroundTime);
                if (turnaroundConstraint > constraintTime) {
                    constraintTime = turnaroundConstraint;
                }
            }
            if (constraintTime > maxConstraintTime) {
                maxConstraintTime = constraintTime;
                bottleneckDep = depFlight;
            }
        }
        // If we found a dependency that drove/constrained this flight's start time, move to it
        if (bottleneckDep && current.scheduledTime) {
            // Check if the constraint time is close to or bounds the scheduled time
            // Even if there was resource delay, this dependency was a bottleneck constraint
            path.unshift(bottleneckDep);
            current = bottleneckDep;
        }
        else {
            break;
        }
    }
    // Calculate total delay along the bottleneck chain (scheduled time minus planned time for each node in path)
    let totalDelay = 0;
    for (const f of path) {
        if (f.scheduledTime) {
            const sched = new Date(f.scheduledTime);
            const plan = new Date(f.plannedTime);
            const delay = diffMinutes(sched, plan);
            if (delay > 0) {
                totalDelay += delay;
            }
        }
    }
    return {
        flights: path,
        totalDelayMinutes: totalDelay
    };
}
