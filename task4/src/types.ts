export type OperationType = 'arrival' | 'departure';
export type Priority = 'high' | 'medium' | 'low';
export type FlightStatus = 'unscheduled' | 'scheduled' | 'cancelled';

export interface Flight {
  flightNumber: string;
  operationType: OperationType;
  priority: Priority;
  plannedTime: string; // ISO 8601 string
  dependencies: string[]; // flightNumbers of parent flights
  runwayRequirement?: string; // Optional preferred/required runway ID (e.g. "Runway 1")
  gateRequirement?: string; // Optional preferred/required gate ID (e.g. "Gate 2")
  
  // Scheduling state
  status: FlightStatus;
  scheduledTime?: string; // ISO 8601 string (when scheduled to start)
  assignedRunway?: string; // ID of assigned runway
  assignedGate?: string; // ID of assigned gate
  cancellationReason?: string;
}

export interface AirportConfig {
  runwayCount: number;
  gateCount: number;
  groundCrewCount: number;
  runwayBufferTakeoff: number; // in minutes
  runwayBufferLanding: number; // in minutes
  runwayBufferMixed: number; // in minutes
  gateTurnaroundTime: number; // in minutes
  dependencyBufferTime: number; // in minutes
  maxSchedulingHorizon: number; // in minutes
  groundCrewServiceTime: number; // in minutes (default 30)
}

export interface RunwayUsage {
  runwayId: string;
  flights: {
    flightNumber: string;
    operationType: OperationType;
    start: string; // ISO string
    end: string; // ISO string (start + separation buffer context)
  }[];
}

export interface GateUsage {
  gateId: string;
  flights: {
    flightNumber: string;
    start: string; // ISO string
    end: string; // ISO string
  }[];
}

export interface CrewUsage {
  crewId: number;
  flights: {
    flightNumber: string;
    start: string; // ISO string
    end: string; // ISO string
  }[];
}

export interface ScheduleResult {
  scheduledFlights: Flight[];
  unscheduledFlights: {
    flight: Flight;
    reason: string;
  }[];
  timeline: TimelineEvent[];
}

export interface TimelineEvent {
  time: string; // ISO string
  type: 'landing' | 'takeoff' | 'gate_entry' | 'gate_exit' | 'crew_assigned' | 'crew_released';
  flightNumber: string;
  details: string;
}

export interface AirportStatus {
  flightCounts: {
    total: number;
    unscheduled: number;
    scheduled: number;
    cancelled: number;
    arrivals: {
      total: number;
      unscheduled: number;
      scheduled: number;
      cancelled: number;
    };
    departures: {
      total: number;
      unscheduled: number;
      scheduled: number;
      cancelled: number;
    };
  };
  activeResourceUsage: {
    occupiedGates: number;
    totalGates: number;
    occupiedRunways: number;
    totalRunways: number;
    activeGroundCrew: number;
    totalGroundCrew: number;
  };
  resourceConstraintIndicators: {
    gatesCongested: boolean;
    runwaysCongested: boolean;
    crewsCongested: boolean;
  };
  blockedFlights: {
    flightNumber: string;
    operationType: OperationType;
    plannedTime: string;
    reason: string;
  }[];
  scheduleCompletionTime?: string;
}
