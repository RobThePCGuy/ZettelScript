import { describe, it, expect } from 'vitest';
import {
  parseClientMessage,
  serializeServerMessage,
  isValidPath,
  generateToken,
  generateSessionNonce,
  PROTOCOL_VERSION,
  type HelloMessage,
  type CreateFromGhostMessage,
  type HelloOkMessage,
  type PatchMessage,
} from '../../src/cli/server/ws-protocol.js';

describe('ws-protocol', () => {
  describe('parseClientMessage', () => {
    it('should parse valid hello message', () => {
      const msg: HelloMessage = {
        type: 'hello',
        protocolVersion: '1.0.0',
        atlasVersion: '2.0.0',
        token: 'test-token',
      };
      const result = parseClientMessage(JSON.stringify(msg));
      expect(result).toEqual(msg);
    });

    it('should parse valid create_from_ghost message', () => {
      const msg: CreateFromGhostMessage = {
        type: 'create_from_ghost',
        sessionNonce: 'nonce-123',
        ghostId: 'ghost:Test Note',
        title: 'Test Note',
        sourceNodeId: 'node-abc',
        targetFolder: 'Notes',
      };
      const result = parseClientMessage(JSON.stringify(msg));
      expect(result).toEqual(msg);
    });

    it('should return null for invalid JSON', () => {
      const result = parseClientMessage('not json');
      expect(result).toBeNull();
    });

    it('should return null for object without type', () => {
      const result = parseClientMessage(JSON.stringify({ foo: 'bar' }));
      expect(result).toBeNull();
    });

    it('should return null for non-object', () => {
      const result = parseClientMessage(JSON.stringify('string'));
      expect(result).toBeNull();
    });
  });

  describe('serializeServerMessage', () => {
    it('should serialize hello_ok message', () => {
      const msg: HelloOkMessage = {
        type: 'hello_ok',
        protocolVersion: '1.0.0',
        sessionId: 'session-123',
        sessionNonce: 'nonce-456',
        features: { ghostCreate: true, patch: true },
      };
      const result = serializeServerMessage(msg);
      expect(JSON.parse(result)).toEqual(msg);
    });

    it('should serialize patch message', () => {
      const msg: PatchMessage = {
        type: 'patch',
        patchSeq: 1,
        ops: [
          {
            op: 'node_replace',
            ghostId: 'ghost:Test',
            newNodeId: 'node-123',
            label: 'Test',
            filePath: 'Test.md',
            type: 'note',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
      };
      const result = serializeServerMessage(msg);
      expect(JSON.parse(result)).toEqual(msg);
    });
  });

  describe('isValidPath', () => {
    it('should accept undefined/empty path', () => {
      expect(isValidPath(undefined)).toBe(true);
      expect(isValidPath('')).toBe(true);
    });

    it('should accept valid relative paths', () => {
      expect(isValidPath('Notes')).toBe(true);
      expect(isValidPath('Notes/Characters')).toBe(true);
      expect(isValidPath('My Notes/Subdir')).toBe(true);
    });

    it('should reject absolute paths', () => {
      expect(isValidPath('/etc/passwd')).toBe(false);
      expect(isValidPath('C:/Windows')).toBe(false);
      expect(isValidPath('D:\\Documents')).toBe(false);
    });

    it('should reject path traversal', () => {
      expect(isValidPath('..')).toBe(false);
      expect(isValidPath('../secret')).toBe(false);
      expect(isValidPath('notes/../../../etc')).toBe(false);
    });

    it('should reject hidden directories', () => {
      expect(isValidPath('.git')).toBe(false);
      expect(isValidPath('notes/.secret')).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate 64-character hex string', () => {
      const token = generateToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate unique tokens', () => {
      const token1 = generateToken();
      const token2 = generateToken();
      expect(token1).not.toEqual(token2);
    });
  });

  describe('generateSessionNonce', () => {
    it('should generate 32-character hex string', () => {
      const nonce = generateSessionNonce();
      expect(nonce).toHaveLength(32);
      expect(nonce).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate unique nonces', () => {
      const nonce1 = generateSessionNonce();
      const nonce2 = generateSessionNonce();
      expect(nonce1).not.toEqual(nonce2);
    });
  });

  describe('PROTOCOL_VERSION', () => {
    it('should be a valid semver string', () => {
      expect(PROTOCOL_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });
});
