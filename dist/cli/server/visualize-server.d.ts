/**
 * WebSocket Server for Ghost Nodes v2
 *
 * Provides live graph updates for the visualizer, enabling seamless
 * ghost node creation without page reload.
 */
import type { CLIContext } from '../utils.js';
export interface VisualizeServerOptions {
    ctx: CLIContext;
    onClose?: (() => void) | undefined;
}
export interface ServerInfo {
    port: number;
    token: string;
    tokenExpiry: number;
}
/**
 * WebSocket server for live graph updates
 */
export declare class VisualizeServer {
    private server;
    private wss;
    private ctx;
    private token;
    private tokenExpiry;
    private sessions;
    private recentCreations;
    private onClose?;
    constructor(options: VisualizeServerOptions);
    /**
     * Verify client connection before upgrade
     */
    private verifyClient;
    /**
     * Set up WebSocket event handlers
     */
    private setupWebSocket;
    /**
     * Handle incoming WebSocket message
     */
    private handleMessage;
    /**
     * Handle hello handshake
     */
    private handleHello;
    /**
     * Handle ghost creation request
     */
    private handleCreateFromGhost;
    /**
     * Create a new note from a ghost node
     */
    private createNoteFromGhost;
    /**
     * Handle linking ghost to an existing node
     */
    private handleLinkToExisting;
    /**
     * Convert unresolved links for a ghost to explicit_link edges
     */
    private convertUnresolvedLinks;
    /**
     * Handle sync request (for reconnection)
     */
    private handleSyncRequest;
    /**
     * Sanitize a filename
     */
    private sanitizeFilename;
    /**
     * Send a message to a specific session
     */
    private send;
    /**
     * Send an error message
     */
    private sendError;
    /**
     * Broadcast a message to all authenticated sessions
     */
    private broadcast;
    /**
     * Start the server
     */
    start(): Promise<ServerInfo>;
    /**
     * Stop the server
     */
    stop(): Promise<void>;
    /**
     * Refresh the auth token
     */
    refreshToken(): string;
}
/**
 * Create and start a visualize server
 */
export declare function createVisualizeServer(ctx: CLIContext, options?: {
    onClose?: () => void;
}): Promise<{
    server: VisualizeServer;
    info: ServerInfo;
}>;
//# sourceMappingURL=visualize-server.d.ts.map