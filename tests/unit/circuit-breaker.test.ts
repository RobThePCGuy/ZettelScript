import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CircuitBreaker,
  CircuitState,
  getCircuitBreaker,
  resetCircuitBreaker,
} from '../../src/core/circuit-breaker';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({ maxFailures: 3, cooldownMs: 1000 });
    resetCircuitBreaker();
  });

  describe('initial state', () => {
    it('should start in CLOSED state', () => {
      expect(breaker.getState('embeddings')).toBe(CircuitState.CLOSED);
    });

    it('should allow attempts in CLOSED state', () => {
      expect(breaker.shouldAttempt('embeddings')).toBe(true);
    });

    it('should report no warnings when healthy', () => {
      expect(breaker.getWarnings()).toEqual([]);
    });

    it('should not have degraded subsystems initially', () => {
      expect(breaker.hasDegradedSubsystems()).toBe(false);
    });
  });

  describe('state transitions', () => {
    it('CLOSED -> OPEN after maxFailures', () => {
      const error = new Error('test failure');

      // Record failures up to threshold
      breaker.recordFailure('embeddings', error);
      expect(breaker.getState('embeddings')).toBe(CircuitState.CLOSED);
      expect(breaker.shouldAttempt('embeddings')).toBe(true);

      breaker.recordFailure('embeddings', error);
      expect(breaker.getState('embeddings')).toBe(CircuitState.CLOSED);
      expect(breaker.shouldAttempt('embeddings')).toBe(true);

      breaker.recordFailure('embeddings', error);
      expect(breaker.getState('embeddings')).toBe(CircuitState.OPEN);
      expect(breaker.shouldAttempt('embeddings')).toBe(false);
    });

    it('OPEN -> HALF_OPEN after cooldown', () => {
      vi.useFakeTimers();
      const testBreaker = new CircuitBreaker({ maxFailures: 3, cooldownMs: 1000 });
      const error = new Error('test failure');

      // Trigger OPEN state
      testBreaker.recordFailure('embeddings', error);
      testBreaker.recordFailure('embeddings', error);
      testBreaker.recordFailure('embeddings', error);

      expect(testBreaker.getState('embeddings')).toBe(CircuitState.OPEN);

      // Advance time past cooldown
      vi.advanceTimersByTime(1100);

      expect(testBreaker.getState('embeddings')).toBe(CircuitState.HALF_OPEN);
      expect(testBreaker.shouldAttempt('embeddings')).toBe(true);

      vi.useRealTimers();
    });

    it('HALF_OPEN -> CLOSED on success', () => {
      vi.useFakeTimers();
      const testBreaker = new CircuitBreaker({ maxFailures: 3, cooldownMs: 1000 });
      const error = new Error('test failure');

      // Trigger OPEN state
      testBreaker.recordFailure('embeddings', error);
      testBreaker.recordFailure('embeddings', error);
      testBreaker.recordFailure('embeddings', error);

      // Advance time past cooldown
      vi.advanceTimersByTime(1100);

      // Record success in HALF_OPEN state
      testBreaker.shouldAttempt('embeddings'); // Enter HALF_OPEN
      testBreaker.recordSuccess('embeddings');

      expect(testBreaker.getState('embeddings')).toBe(CircuitState.CLOSED);
      expect(testBreaker.shouldAttempt('embeddings')).toBe(true);

      vi.useRealTimers();
    });

    it('HALF_OPEN -> OPEN on failure', () => {
      vi.useFakeTimers();
      const testBreaker = new CircuitBreaker({ maxFailures: 3, cooldownMs: 1000 });
      const error = new Error('test failure');

      // Trigger OPEN state
      testBreaker.recordFailure('embeddings', error);
      testBreaker.recordFailure('embeddings', error);
      testBreaker.recordFailure('embeddings', error);

      // Advance time past cooldown
      vi.advanceTimersByTime(1100);

      // Record failure in HALF_OPEN state
      testBreaker.shouldAttempt('embeddings'); // Enter HALF_OPEN
      testBreaker.recordFailure('embeddings', error);

      expect(testBreaker.getState('embeddings')).toBe(CircuitState.OPEN);
      expect(testBreaker.shouldAttempt('embeddings')).toBe(false);

      vi.useRealTimers();
    });

    it('should reset failure count on success', () => {
      const error = new Error('test failure');

      // Record some failures (below threshold)
      breaker.recordFailure('embeddings', error);
      breaker.recordFailure('embeddings', error);

      // Record success
      breaker.recordSuccess('embeddings');

      // Should be back to zero failures
      const status = breaker.getStatus('embeddings');
      expect(status.failureCount).toBe(0);
      expect(status.lastError).toBeNull();
    });
  });

  describe('subsystem isolation', () => {
    it('should track subsystems independently', () => {
      const error = new Error('test failure');

      // Fail embeddings
      breaker.recordFailure('embeddings', error);
      breaker.recordFailure('embeddings', error);
      breaker.recordFailure('embeddings', error);

      // vectorDb should still be healthy
      expect(breaker.getState('embeddings')).toBe(CircuitState.OPEN);
      expect(breaker.getState('vectorDb')).toBe(CircuitState.CLOSED);
      expect(breaker.shouldAttempt('vectorDb')).toBe(true);
    });

    it('should report degraded when any subsystem is OPEN', () => {
      const error = new Error('test failure');

      breaker.recordFailure('fts', error);
      breaker.recordFailure('fts', error);
      breaker.recordFailure('fts', error);

      expect(breaker.hasDegradedSubsystems()).toBe(true);
    });
  });

  describe('status reporting', () => {
    it('should report status with all fields', () => {
      const error = new Error('API rate limit exceeded');
      breaker.recordFailure('embeddings', error);

      const status = breaker.getStatus('embeddings');
      expect(status.state).toBe(CircuitState.CLOSED);
      expect(status.failureCount).toBe(1);
      expect(status.lastFailure).toBeInstanceOf(Date);
      expect(status.lastError).toBe('API rate limit exceeded');
      expect(status.cooldownRemainingMs).toBeNull(); // Not in OPEN state
    });

    it('should report cooldown remaining when OPEN', () => {
      const error = new Error('test failure');

      breaker.recordFailure('embeddings', error);
      breaker.recordFailure('embeddings', error);
      breaker.recordFailure('embeddings', error);

      const status = breaker.getStatus('embeddings');
      expect(status.state).toBe(CircuitState.OPEN);
      expect(status.cooldownRemainingMs).toBeGreaterThan(0);
      expect(status.cooldownRemainingMs).toBeLessThanOrEqual(1000);
    });

    it('should return all active subsystem statuses', () => {
      const error = new Error('test failure');

      breaker.recordFailure('embeddings', error);
      breaker.recordSuccess('vectorDb');

      const all = breaker.getAllStatus();
      expect(all.embeddings).toBeDefined();
      expect(all.vectorDb).toBeDefined();
    });
  });

  describe('warnings', () => {
    it('should generate warning when OPEN', () => {
      const error = new Error('test failure');

      breaker.recordFailure('embeddings', error);
      breaker.recordFailure('embeddings', error);
      breaker.recordFailure('embeddings', error);

      const warnings = breaker.getWarnings();
      expect(warnings.length).toBe(1);
      expect(warnings[0]).toMatch(/embeddings disabled/);
      expect(warnings[0]).toMatch(/cooldown/);
    });

    it('should generate warning when HALF_OPEN', () => {
      vi.useFakeTimers();
      const testBreaker = new CircuitBreaker({ maxFailures: 3, cooldownMs: 1000 });
      const error = new Error('test failure');

      testBreaker.recordFailure('embeddings', error);
      testBreaker.recordFailure('embeddings', error);
      testBreaker.recordFailure('embeddings', error);

      vi.advanceTimersByTime(1100);

      // Trigger HALF_OPEN by checking shouldAttempt
      testBreaker.shouldAttempt('embeddings');

      const warnings = testBreaker.getWarnings();
      expect(warnings.length).toBe(1);
      expect(warnings[0]).toMatch(/embeddings recovering/);

      vi.useRealTimers();
    });

    it('should generate multiple warnings for multiple degraded subsystems', () => {
      const error = new Error('test failure');

      breaker.recordFailure('embeddings', error);
      breaker.recordFailure('embeddings', error);
      breaker.recordFailure('embeddings', error);

      breaker.recordFailure('fts', error);
      breaker.recordFailure('fts', error);
      breaker.recordFailure('fts', error);

      const warnings = breaker.getWarnings();
      expect(warnings.length).toBe(2);
    });
  });

  describe('reset', () => {
    it('should reset a specific subsystem', () => {
      const error = new Error('test failure');

      breaker.recordFailure('embeddings', error);
      breaker.recordFailure('embeddings', error);
      breaker.recordFailure('embeddings', error);

      expect(breaker.getState('embeddings')).toBe(CircuitState.OPEN);

      breaker.reset('embeddings');

      expect(breaker.getState('embeddings')).toBe(CircuitState.CLOSED);
      expect(breaker.shouldAttempt('embeddings')).toBe(true);
    });

    it('should reset all subsystems', () => {
      const error = new Error('test failure');

      breaker.recordFailure('embeddings', error);
      breaker.recordFailure('embeddings', error);
      breaker.recordFailure('embeddings', error);

      breaker.recordFailure('vectorDb', error);
      breaker.recordFailure('vectorDb', error);
      breaker.recordFailure('vectorDb', error);

      breaker.resetAll();

      expect(breaker.getState('embeddings')).toBe(CircuitState.CLOSED);
      expect(breaker.getState('vectorDb')).toBe(CircuitState.CLOSED);
    });
  });

  describe('default singleton', () => {
    it('should return the same instance', () => {
      const a = getCircuitBreaker();
      const b = getCircuitBreaker();
      expect(a).toBe(b);
    });

    it('should reset singleton on resetCircuitBreaker', () => {
      const a = getCircuitBreaker();
      resetCircuitBreaker();
      const b = getCircuitBreaker();
      expect(a).not.toBe(b);
    });
  });

  describe('concurrent recovery protection', () => {
    it('should prevent multiple concurrent recovery attempts', () => {
      vi.useFakeTimers();
      const testBreaker = new CircuitBreaker({ maxFailures: 3, cooldownMs: 1000 });
      const error = new Error('test failure');

      // Trigger OPEN state
      testBreaker.recordFailure('embeddings', error);
      testBreaker.recordFailure('embeddings', error);
      testBreaker.recordFailure('embeddings', error);

      expect(testBreaker.getState('embeddings')).toBe(CircuitState.OPEN);

      // Advance time past cooldown
      vi.advanceTimersByTime(1100);

      expect(testBreaker.getState('embeddings')).toBe(CircuitState.HALF_OPEN);

      // First call enters HALF_OPEN
      const first = testBreaker.shouldAttempt('embeddings');
      expect(first).toBe(true);

      // Second call should be blocked (recovery in progress)
      const second = testBreaker.shouldAttempt('embeddings');
      expect(second).toBe(false);

      vi.useRealTimers();
    });
  });
});
