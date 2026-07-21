/**
 * Circuit breaker pattern for graceful degradation
 *
 * Prevents cascading failures by tracking error rates and temporarily
 * disabling expensive operations that are consistently failing.
 *
 * States:
 * - CLOSED: Normal operation, calls pass through
 * - OPEN: Too many failures, calls are blocked (returns empty/warning)
 * - HALF_OPEN: Cooldown elapsed, allowing a probe call to test recovery
 */
export declare enum CircuitState {
    CLOSED = "CLOSED",
    OPEN = "OPEN",
    HALF_OPEN = "HALF_OPEN"
}
export type SubsystemName = 'embeddings' | 'vectorDb' | 'fts';
export interface CircuitBreakerConfig {
    maxFailures: number;
    cooldownMs: number;
}
export interface CircuitStatus {
    state: CircuitState;
    failureCount: number;
    totalFailures: number;
    lastFailure: Date | null;
    lastError: string | null;
    cooldownRemainingMs: number | null;
}
/**
 * Central circuit breaker manager for all subsystems
 */
export declare class CircuitBreaker {
    private breakers;
    private config;
    constructor(config?: Partial<CircuitBreakerConfig>);
    private getBreaker;
    /**
     * Check if a call to the subsystem should be attempted
     */
    shouldAttempt(subsystem: SubsystemName): boolean;
    /**
     * Record a successful call to the subsystem
     */
    recordSuccess(subsystem: SubsystemName): void;
    /**
     * Record a failed call to the subsystem
     */
    recordFailure(subsystem: SubsystemName, error: Error): void;
    /**
     * Get the state of a subsystem
     */
    getState(subsystem: SubsystemName): CircuitState;
    /**
     * Get detailed status of a subsystem
     */
    getStatus(subsystem: SubsystemName): CircuitStatus;
    /**
     * Get status of all active subsystems
     */
    getAllStatus(): Record<SubsystemName, CircuitStatus>;
    /**
     * Check if any subsystem is in a degraded state (OPEN or HALF_OPEN)
     */
    hasDegradedSubsystems(): boolean;
    /**
     * Get warnings for degraded subsystems (for health summary)
     */
    getWarnings(): string[];
    /**
     * Reset a specific subsystem (for testing or manual intervention)
     */
    reset(subsystem: SubsystemName): void;
    /**
     * Reset all subsystems
     */
    resetAll(): void;
}
/**
 * Get the default circuit breaker instance
 */
export declare function getCircuitBreaker(): CircuitBreaker;
/**
 * Set the default circuit breaker instance (for testing)
 */
export declare function setCircuitBreaker(breaker: CircuitBreaker): void;
/**
 * Reset the default circuit breaker instance (for testing)
 */
export declare function resetCircuitBreaker(): void;
//# sourceMappingURL=circuit-breaker.d.ts.map