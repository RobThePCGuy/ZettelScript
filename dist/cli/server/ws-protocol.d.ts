/**
 * WebSocket Protocol Types for Ghost Nodes v2
 *
 * Defines the message format for communication between the visualizer
 * client (browser) and the ZettelScript server.
 */
export declare const PROTOCOL_VERSION = "1.0.0";
export interface BaseMessage {
    type: string;
}
export interface ClientMessage extends BaseMessage {
    sessionNonce?: string;
}
export interface ServerMessage extends BaseMessage {
}
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
export type PatchOp = NodeReplaceOp | EdgeReplaceOp | NodeRemoveOp | EdgeRemoveOp;
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
export interface PingMessage extends ClientMessage {
    type: 'ping';
}
export interface PongMessage extends ServerMessage {
    type: 'pong';
}
export type ClientToServerMessage = HelloMessage | CreateFromGhostMessage | SyncRequestMessage | PingMessage;
export type ServerToClientMessage = HelloOkMessage | HelloErrorMessage | CreateAckMessage | PatchMessage | ErrorMessage | IndexProgressMessage | SyncResponseMessage | PongMessage;
/**
 * Parse a client message from JSON string
 */
export declare function parseClientMessage(data: string): ClientToServerMessage | null;
/**
 * Serialize a server message to JSON string
 */
export declare function serializeServerMessage(message: ServerToClientMessage): string;
/**
 * Validate that a path does not contain path traversal attempts
 */
export declare function isValidPath(targetFolder: string | undefined): boolean;
/**
 * Generate a cryptographically secure token
 */
export declare function generateToken(): string;
/**
 * Generate a session nonce
 */
export declare function generateSessionNonce(): string;
//# sourceMappingURL=ws-protocol.d.ts.map