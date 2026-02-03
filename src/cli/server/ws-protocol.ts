/**
 * WebSocket Protocol Types for Ghost Nodes v2
 *
 * Defines the message format for communication between the visualizer
 * client (browser) and the ZettelScript server.
 */

// Protocol version for compatibility checking
export const PROTOCOL_VERSION = '1.0.0';

// ============================================================================
// Base Message Types
// ============================================================================

export interface BaseMessage {
  type: string;
}

export interface ClientMessage extends BaseMessage {
  sessionNonce?: string;
}

export interface ServerMessage extends BaseMessage {}

// ============================================================================
// Handshake Messages
// ============================================================================

export interface HelloMessage extends ClientMessage {
  type: 'hello';
  protocolVersion: string;
  atlasVersion: string;
  token: string;
}

export interface HelloOkMessage extends ServerMessage {
  type: 'hello_ok';
  protocolVersion: string;
  sessionId: string;
  sessionNonce: string;
  features: {
    ghostCreate: boolean;
    patch: boolean;
  };
}

export interface HelloErrorMessage extends ServerMessage {
  type: 'hello_error';
  error: string;
  code: 'invalid_token' | 'protocol_mismatch' | 'origin_mismatch';
}

// ============================================================================
// Ghost Creation Messages
// ============================================================================

export interface CreateFromGhostMessage extends ClientMessage {
  type: 'create_from_ghost';
  sessionNonce: string;
  ghostId: string;
  title: string;
  sourceNodeId: string;
  targetFolder?: string;
  templateName?: string;
}

export interface CreateAckMessage extends ServerMessage {
  type: 'create_ack';
  ghostId: string;
  status: 'pending' | 'success' | 'error';
}

// ============================================================================
// Patch Messages
// ============================================================================

export type PatchOp =
  | NodeReplaceOp
  | EdgeReplaceOp
  | NodeRemoveOp
  | EdgeRemoveOp;

export interface NodeReplaceOp {
  op: 'node_replace';
  ghostId: string;
  newNodeId: string;
  label: string;
  filePath: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  linkedExisting?: boolean;
}

export interface EdgeReplaceOp {
  op: 'edge_replace';
  oldEdgeId?: string;
  newEdgeId: string;
  fromId: string;
  toId: string;
  type: string;
}

export interface NodeRemoveOp {
  op: 'node_remove';
  nodeId: string;
}

export interface EdgeRemoveOp {
  op: 'edge_remove';
  edgeId: string;
}

export interface PatchMessage extends ServerMessage {
  type: 'patch';
  patchSeq: number;
  ops: PatchOp[];
}

// ============================================================================
// Error & Progress Messages
// ============================================================================

export interface ErrorMessage extends ServerMessage {
  type: 'error';
  ghostId?: string;
  message: string;
  code?: string;
}

export interface IndexProgressMessage extends ServerMessage {
  type: 'index_progress';
  phase: 'creating' | 'indexing' | 'complete';
  percent: number;
}

// ============================================================================
// Sync Messages (for reconnection)
// ============================================================================

export interface SyncRequestMessage extends ClientMessage {
  type: 'sync_request';
  sessionNonce: string;
}

export interface SyncResponseMessage extends ServerMessage {
  type: 'sync_response';
  unresolvedList: GhostNodeInfo[];
  recentCreations: RecentCreation[];
}

export interface GhostNodeInfo {
  ghostId: string;
  title: string;
  referenceCount: number;
  sourceIds: string[];
  firstSeen: string;
  mostRecentRef?: string;
}

export interface RecentCreation {
  ghostId: string;
  newNodeId: string;
  title: string;
  createdAt: string;
}

// ============================================================================
// Connection Status Messages
// ============================================================================

export interface PingMessage extends ClientMessage {
  type: 'ping';
}

export interface PongMessage extends ServerMessage {
  type: 'pong';
}

// ============================================================================
// Union Types
// ============================================================================

export type ClientToServerMessage =
  | HelloMessage
  | CreateFromGhostMessage
  | SyncRequestMessage
  | PingMessage;

export type ServerToClientMessage =
  | HelloOkMessage
  | HelloErrorMessage
  | CreateAckMessage
  | PatchMessage
  | ErrorMessage
  | IndexProgressMessage
  | SyncResponseMessage
  | PongMessage;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse a client message from JSON string
 */
export function parseClientMessage(data: string): ClientToServerMessage | null {
  try {
    const parsed = JSON.parse(data);
    if (typeof parsed !== 'object' || !parsed.type) {
      return null;
    }
    return parsed as ClientToServerMessage;
  } catch {
    return null;
  }
}

/**
 * Serialize a server message to JSON string
 */
export function serializeServerMessage(message: ServerToClientMessage): string {
  return JSON.stringify(message);
}

/**
 * Validate that a path does not contain path traversal attempts
 */
export function isValidPath(targetFolder: string | undefined): boolean {
  if (!targetFolder) return true;

  // Reject absolute paths
  if (targetFolder.startsWith('/') || /^[a-zA-Z]:/.test(targetFolder)) {
    return false;
  }

  // Reject path traversal
  if (targetFolder.includes('..')) {
    return false;
  }

  // Reject hidden directories
  if (targetFolder.startsWith('.') || targetFolder.includes('/.')) {
    return false;
  }

  return true;
}

/**
 * Generate a cryptographically secure token
 */
export function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a session nonce
 */
export function generateSessionNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
