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

import { getLogger } from './logger';

const logger = getLogger().child('circuit-breaker');

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
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

interface SubsystemState {
  failureCount: number;
  totalFailures: number;
  lastFailure: number | null;
  lastError: string | null;
  recoveryInProgress: boolean;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  maxFailures: 3,
  cooldownMs: 600_000, // 10 minutes
};

/**
 * Circuit breaker for a single subsystem
 */
class SubsystemBreaker {
  private state: SubsystemState = {
    failureCount: 0,
    totalFailures: 0,
    lastFailure: null,
    lastError: null,
    recoveryInProgress: false,
  };

  constructor(
    private name: SubsystemName,
    private config: CircuitBreakerConfig
  ) {}

  /**
   * Check if a call should be attempted
   * Returns true for CLOSED or HALF_OPEN states
   */
  shouldAttempt(): boolean {
    // Under failure threshold = CLOSED state
    if (this.state.failureCount < this.config.maxFailures) {
      return true;
    }

    // Check if cooldown has elapsed
    if (this.state.lastFailure !== null) {
      const elapsed = Date.now() - this.state.lastFailure;
      if (elapsed >= this.config.cooldownMs) {
        // Prevent multiple concurrent recovery attempts
        if (this.state.recoveryInProgress) {
          return false;
        }

        // Enter HALF_OPEN state
        this.state.recoveryInProgress = true;
        logger.info(`${this.name}: circuit breaker entering HALF_OPEN - attempting recovery`);
        return true;
      }
    }

    return false;
  }

  /**
   * Record a successful call (resets the breaker)
   */
  recordSuccess(): void {
    const wasOpen = this.state.failureCount >= this.config.maxFailures;
    this.state.failureCount = 0;
    this.state.lastFailure = null;
    this.state.lastError = null;
    this.state.recoveryInProgress = false;

    if (wasOpen) {
      logger.info(`${this.name}: circuit breaker CLOSED - recovery successful`);
    }
  }

  /**
   * Record a failed call
   */
  recordFailure(error: Error): void {
    this.state.failureCount++;
    this.state.totalFailures++;
    this.state.lastFailure = Date.now();
    this.state.lastError = error.message;
    this.state.recoveryInProgress = false;

    logger.warn(
      `${this.name}: failure ${this.state.failureCount}/${this.config.maxFailures}: ${error.message}`
    );

    if (this.state.failureCount >= this.config.maxFailures) {
      logger.error(
        `${this.name}: circuit breaker OPEN - will retry after ${this.config.cooldownMs / 1000}s cooldown`
      );
    }
  }

  /**
   * Get the current state of this subsystem
   */
  getState(): CircuitState {
    if (this.state.failureCount < this.config.maxFailures) {
      return CircuitState.CLOSED;
    }

    if (this.state.lastFailure !== null) {
      const elapsed = Date.now() - this.state.lastFailure;
      if (elapsed >= this.config.cooldownMs) {
        return CircuitState.HALF_OPEN;
      }
    }

    return CircuitState.OPEN;
  }

  /**
   * Get detailed status for reporting
   */
  getStatus(): CircuitStatus {
    const state = this.getState();
    let cooldownRemainingMs: number | null = null;

    if (state === CircuitState.OPEN && this.state.lastFailure !== null) {
      const elapsed = Date.now() - this.state.lastFailure;
      cooldownRemainingMs = Math.max(0, this.config.cooldownMs - elapsed);
    }

    return {
      state,
      failureCount: this.state.failureCount,
      totalFailures: this.state.totalFailures,
      lastFailure: this.state.lastFailure ? new Date(this.state.lastFailure) : null,
      lastError: this.state.lastError,
      cooldownRemainingMs,
    };
  }

  /**
   * Reset the breaker (for testing or manual intervention)
   */
  reset(): void {
    this.state = {
      failureCount: 0,
      totalFailures: 0,
      lastFailure: null,
      lastError: null,
      recoveryInProgress: false,
    };
    logger.info(`${this.name}: circuit breaker manually reset`);
  }
}

/**
 * Central circuit breaker manager for all subsystems
 */
export class CircuitBreaker {
  private breakers: Map<SubsystemName, SubsystemBreaker> = new Map();
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private getBreaker(subsystem: SubsystemName): SubsystemBreaker {
    let breaker = this.breakers.get(subsystem);
    if (!breaker) {
      breaker = new SubsystemBreaker(subsystem, this.config);
      this.breakers.set(subsystem, breaker);
    }
    return breaker;
  }

  /**
   * Check if a call to the subsystem should be attempted
   */
  shouldAttempt(subsystem: SubsystemName): boolean {
    return this.getBreaker(subsystem).shouldAttempt();
  }

  /**
   * Record a successful call to the subsystem
   */
  recordSuccess(subsystem: SubsystemName): void {
    this.getBreaker(subsystem).recordSuccess();
  }

  /**
   * Record a failed call to the subsystem
   */
  recordFailure(subsystem: SubsystemName, error: Error): void {
    this.getBreaker(subsystem).recordFailure(error);
  }

  /**
   * Get the state of a subsystem
   */
  getState(subsystem: SubsystemName): CircuitState {
    return this.getBreaker(subsystem).getState();
  }

  /**
   * Get detailed status of a subsystem
   */
  getStatus(subsystem: SubsystemName): CircuitStatus {
    return this.getBreaker(subsystem).getStatus();
  }

  /**
   * Get status of all active subsystems
   */
  getAllStatus(): Record<SubsystemName, CircuitStatus> {
    const result: Partial<Record<SubsystemName, CircuitStatus>> = {};
    for (const [name, breaker] of this.breakers) {
      result[name] = breaker.getStatus();
    }
    return result as Record<SubsystemName, CircuitStatus>;
  }

  /**
   * Check if any subsystem is in a degraded state (OPEN or HALF_OPEN)
   */
  hasDegradedSubsystems(): boolean {
    for (const breaker of this.breakers.values()) {
      const state = breaker.getState();
      if (state !== CircuitState.CLOSED) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get warnings for degraded subsystems (for health summary)
   */
  getWarnings(): string[] {
    const warnings: string[] = [];
    for (const [name, breaker] of this.breakers) {
      const status = breaker.getStatus();
      if (status.state === CircuitState.OPEN && status.cooldownRemainingMs !== null) {
        const cooldownMinutes = Math.ceil(status.cooldownRemainingMs / 60_000);
        warnings.push(`${name} disabled (cooldown ${cooldownMinutes}m)`);
      } else if (status.state === CircuitState.HALF_OPEN) {
        warnings.push(`${name} recovering`);
      }
    }
    return warnings;
  }

  /**
   * Reset a specific subsystem (for testing or manual intervention)
   */
  reset(subsystem: SubsystemName): void {
    this.getBreaker(subsystem).reset();
  }

  /**
   * Reset all subsystems
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

// Default singleton instance
let defaultCircuitBreaker: CircuitBreaker | null = null;

/**
 * Get the default circuit breaker instance
 */
export function getCircuitBreaker(): CircuitBreaker {
  if (!defaultCircuitBreaker) {
    defaultCircuitBreaker = new CircuitBreaker();
  }
  return defaultCircuitBreaker;
}

/**
 * Set the default circuit breaker instance (for testing)
 */
export function setCircuitBreaker(breaker: CircuitBreaker): void {
  defaultCircuitBreaker = breaker;
}

/**
 * Reset the default circuit breaker instance (for testing)
 */
export function resetCircuitBreaker(): void {
  defaultCircuitBreaker = null;
}
