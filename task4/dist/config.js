import dotenv from 'dotenv';
dotenv.config();
function parseEnvInt(key, defaultValue) {
    const value = process.env[key];
    if (value === undefined) {
        if (defaultValue !== undefined)
            return defaultValue;
        throw new Error(`Missing required environment variable: ${key}`);
    }
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed.toString() !== value.trim()) {
        throw new Error(`Environment variable ${key} must be a valid integer, got "${value}"`);
    }
    return parsed;
}
export function validateConfig() {
    const runwayCount = parseEnvInt('RUNWAY_COUNT');
    if (runwayCount <= 0)
        throw new Error('RUNWAY_COUNT must be a positive integer');
    const gateCount = parseEnvInt('GATE_COUNT');
    if (gateCount <= 0)
        throw new Error('GATE_COUNT must be a positive integer');
    const groundCrewCount = parseEnvInt('GROUND_CREW_COUNT');
    if (groundCrewCount <= 0)
        throw new Error('GROUND_CREW_COUNT must be a positive integer');
    const runwayBufferTakeoff = parseEnvInt('RUNWAY_BUFFER_TAKEOFF');
    if (runwayBufferTakeoff < 0)
        throw new Error('RUNWAY_BUFFER_TAKEOFF must be a non-negative integer');
    const runwayBufferLanding = parseEnvInt('RUNWAY_BUFFER_LANDING');
    if (runwayBufferLanding < 0)
        throw new Error('RUNWAY_BUFFER_LANDING must be a non-negative integer');
    const runwayBufferMixed = parseEnvInt('RUNWAY_BUFFER_MIXED');
    if (runwayBufferMixed < 0)
        throw new Error('RUNWAY_BUFFER_MIXED must be a non-negative integer');
    const gateTurnaroundTime = parseEnvInt('GATE_TURNAROUND_TIME');
    if (gateTurnaroundTime < 0)
        throw new Error('GATE_TURNAROUND_TIME must be a non-negative integer');
    const dependencyBufferTime = parseEnvInt('DEPENDENCY_BUFFER_TIME');
    if (dependencyBufferTime < 0)
        throw new Error('DEPENDENCY_BUFFER_TIME must be a non-negative integer');
    const maxSchedulingHorizon = parseEnvInt('MAX_SCHEDULING_HORIZON');
    if (maxSchedulingHorizon <= 0)
        throw new Error('MAX_SCHEDULING_HORIZON must be a positive integer');
    const groundCrewServiceTime = parseEnvInt('GROUND_CREW_SERVICE_TIME', 30);
    if (groundCrewServiceTime < 0)
        throw new Error('GROUND_CREW_SERVICE_TIME must be a non-negative integer');
    return {
        runwayCount,
        gateCount,
        groundCrewCount,
        runwayBufferTakeoff,
        runwayBufferLanding,
        runwayBufferMixed,
        gateTurnaroundTime,
        dependencyBufferTime,
        maxSchedulingHorizon,
        groundCrewServiceTime
    };
}
let loadedConfig;
try {
    loadedConfig = validateConfig();
}
catch (error) {
    console.error('Invalid configuration at startup:', error.message);
    process.exit(1);
}
export const airportConfig = Object.freeze(loadedConfig);
