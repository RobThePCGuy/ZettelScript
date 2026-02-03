/**
 * WebSocket Server for Ghost Nodes v2
 *
 * Provides live graph updates for the visualizer, enabling seamless
 * ghost node creation without page reload.
 */

import { createServer, type Server, type IncomingMessage } from 'node:http';
import { WebSocketServer, WebSocket, type RawData } from 'ws';
import { nanoid } from 'nanoid';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { stringify as stringifyYaml } from 'yaml';
import type { CLIContext } from '../utils.js';
import {
  PROTOCOL_VERSION,
  parseClientMessage,
  serializeServerMessage,
  isValidPath,
  generateToken,
  generateSessionNonce,
  type ServerToClientMessage,
  type HelloMessage,
  type CreateFromGhostMessage,
  type SyncRequestMessage,
  type PatchOp,
  type GhostNodeInfo,
} from './ws-protocol.js';

// Token validity period (10 minutes)
const TOKEN_VALIDITY_MS = 10 * 60 * 1000;

// Grace period for reconnection after disconnect
const RECONNECT_GRACE_MS = 30 * 1000;

export interface VisualizeServerOptions {
  ctx: CLIContext;
  onClose?: (() => void) | undefined;
}

export interface ServerInfo {
  port: number;
  token: string;
  tokenExpiry: number;
}

interface ClientSession {
  ws: WebSocket;
  sessionId: string;
  sessionNonce: string;
  authenticated: boolean;
  lastActivity: number;
  patchSeq: number;
  pendingCreates: Set<string>;
}

/**
 * WebSocket server for live graph updates
 */
export class VisualizeServer {
  private server: Server;
  private wss: WebSocketServer;
  private ctx: CLIContext;
  private token: string;
  private tokenExpiry: number;
  private sessions: Map<string, ClientSession> = new Map();
  private recentCreations: Map<string, { newNodeId: string; title: string; createdAt: string }> =
    new Map();
  private onClose?: () => void;

  constructor(options: VisualizeServerOptions) {
    this.ctx = options.ctx;
    if (options.onClose !== undefined) {
      this.onClose = options.onClose;
    }

    // Generate auth token
    this.token = generateToken();
    this.tokenExpiry = Date.now() + TOKEN_VALIDITY_MS;

    // Create HTTP server (bound to localhost only)
    this.server = createServer();

    // Create WebSocket server
    this.wss = new WebSocketServer({
      server: this.server,
      verifyClient: (info, callback) => {
        const valid = this.verifyClient(info);
        callback(valid);
      },
    });

    this.setupWebSocket();
  }

  /**
   * Verify client connection before upgrade
   */
  private verifyClient(info: { origin?: string; req: IncomingMessage }): boolean {
    // Check origin header (allow localhost variants)
    const origin = info.origin || info.req.headers.origin;
    if (origin) {
      const validOrigins = [
        'file://',
        'null', // file:// protocol sends "null" as origin
        'http://localhost',
        'http://127.0.0.1',
        'https://localhost',
        'https://127.0.0.1',
      ];

      const originValid = validOrigins.some((v) => origin === v || origin.startsWith(v + ':'));

      if (!originValid) {
        console.error(`[WS] Rejected connection from origin: ${origin}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Set up WebSocket event handlers
   */
  private setupWebSocket(): void {
    this.wss.on('connection', (ws, req) => {
      const clientAddr = req.socket.remoteAddress;
      console.log(`[WS] New connection from ${clientAddr}`);

      // Create pending session
      const sessionId = nanoid();
      const session: ClientSession = {
        ws,
        sessionId,
        sessionNonce: '',
        authenticated: false,
        lastActivity: Date.now(),
        patchSeq: 0,
        pendingCreates: new Set(),
      };

      this.sessions.set(sessionId, session);

      ws.on('message', (data) => {
        this.handleMessage(sessionId, data);
      });

      ws.on('close', () => {
        console.log(`[WS] Connection closed: ${sessionId}`);
        this.sessions.delete(sessionId);

        // If no sessions left, trigger onClose after grace period
        if (this.sessions.size === 0) {
          setTimeout(() => {
            if (this.sessions.size === 0 && this.onClose) {
              this.onClose();
            }
          }, RECONNECT_GRACE_MS);
        }
      });

      ws.on('error', (err) => {
        console.error(`[WS] Error on session ${sessionId}:`, err);
      });

      // Set a timeout for authentication
      setTimeout(() => {
        const s = this.sessions.get(sessionId);
        if (s && !s.authenticated) {
          console.log(`[WS] Auth timeout for session ${sessionId}`);
          ws.close(4001, 'Authentication timeout');
          this.sessions.delete(sessionId);
        }
      }, 10000);
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(sessionId: string, data: RawData): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const message = parseClientMessage(data.toString());
    if (!message) {
      this.sendError(session, 'Invalid message format');
      return;
    }

    session.lastActivity = Date.now();

    switch (message.type) {
      case 'hello':
        this.handleHello(session, message);
        break;

      case 'create_from_ghost':
        this.handleCreateFromGhost(session, message);
        break;

      case 'sync_request':
        this.handleSyncRequest(session, message);
        break;

      case 'ping':
        this.send(session, { type: 'pong' });
        break;

      default:
        this.sendError(session, `Unknown message type: ${(message as { type: string }).type}`);
    }
  }

  /**
   * Handle hello handshake
   */
  private handleHello(session: ClientSession, message: HelloMessage): void {
    // Check token
    if (message.token !== this.token) {
      this.send(session, {
        type: 'hello_error',
        error: 'Invalid authentication token',
        code: 'invalid_token',
      });
      session.ws.close(4003, 'Invalid token');
      return;
    }

    // Check token expiry
    if (Date.now() > this.tokenExpiry) {
      this.send(session, {
        type: 'hello_error',
        error: 'Token has expired',
        code: 'invalid_token',
      });
      session.ws.close(4003, 'Token expired');
      return;
    }

    // Check protocol version (major version must match)
    const clientMajor = message.protocolVersion.split('.')[0];
    const serverMajor = PROTOCOL_VERSION.split('.')[0];
    if (clientMajor !== serverMajor) {
      this.send(session, {
        type: 'hello_error',
        error: `Protocol version mismatch: server=${PROTOCOL_VERSION}, client=${message.protocolVersion}`,
        code: 'protocol_mismatch',
      });
      session.ws.close(4002, 'Protocol mismatch');
      return;
    }

    // Generate session nonce
    session.sessionNonce = generateSessionNonce();
    session.authenticated = true;

    console.log(`[WS] Session ${session.sessionId} authenticated`);

    this.send(session, {
      type: 'hello_ok',
      protocolVersion: PROTOCOL_VERSION,
      sessionId: session.sessionId,
      sessionNonce: session.sessionNonce,
      features: {
        ghostCreate: true,
        patch: true,
      },
    });
  }

  /**
   * Handle ghost creation request
   */
  private async handleCreateFromGhost(
    session: ClientSession,
    message: CreateFromGhostMessage
  ): Promise<void> {
    // Validate session
    if (!session.authenticated) {
      this.sendError(session, 'Not authenticated');
      return;
    }

    if (message.sessionNonce !== session.sessionNonce) {
      this.sendError(session, 'Invalid session nonce');
      return;
    }

    // Validate path
    if (!isValidPath(message.targetFolder)) {
      this.sendError(session, 'Invalid target folder path', message.ghostId);
      return;
    }

    // Prevent duplicate creates
    if (session.pendingCreates.has(message.ghostId)) {
      this.sendError(session, 'Create already in progress', message.ghostId);
      return;
    }

    session.pendingCreates.add(message.ghostId);

    // Send ack
    this.send(session, {
      type: 'create_ack',
      ghostId: message.ghostId,
      status: 'pending',
    });

    try {
      // Check for existing note with same title
      const existingNodes = await this.ctx.nodeRepository.findByTitleOrAlias(message.title);

      if (existingNodes.length > 0) {
        // Link to existing note instead of creating new one
        const existingNode = existingNodes[0]!;
        await this.handleLinkToExisting(session, message, existingNode);
        return;
      }

      // Create the note
      await this.createNoteFromGhost(session, message);
    } catch (error) {
      console.error(`[WS] Error creating ghost:`, error);
      this.sendError(
        session,
        error instanceof Error ? error.message : 'Unknown error',
        message.ghostId
      );
    } finally {
      session.pendingCreates.delete(message.ghostId);
    }
  }

  /**
   * Create a new note from a ghost node
   */
  private async createNoteFromGhost(
    session: ClientSession,
    message: CreateFromGhostMessage
  ): Promise<void> {
    const { title, targetFolder, ghostId } = message;

    // Determine output path
    const folder = targetFolder || '';
    const filename = this.sanitizeFilename(title) + '.md';
    const relativePath = folder ? path.join(folder, filename) : filename;
    const absolutePath = path.join(this.ctx.vaultPath, relativePath);

    // Ensure directory exists
    const dir = path.dirname(absolutePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Generate stable node ID
    const nodeId = nanoid();
    const now = new Date().toISOString();

    // Create frontmatter
    const frontmatter = {
      id: nodeId,
      type: 'note',
      title: title,
      created: now,
    };

    // Create file content
    const content = `---\n${stringifyYaml(frontmatter)}---\n\n# ${title}\n\n`;

    // Write file
    fs.writeFileSync(absolutePath, content, 'utf-8');

    // Insert node into database
    const node = await this.ctx.nodeRepository.create({
      type: 'note',
      title: title,
      path: relativePath,
      createdAt: now,
      updatedAt: now,
      metadata: { id: nodeId },
    });

    // Convert unresolved links to explicit_link edges
    const convertedEdges = await this.convertUnresolvedLinks(ghostId, node.nodeId, title);

    // Build patch operations
    const ops: PatchOp[] = [];

    // Node replace operation
    ops.push({
      op: 'node_replace',
      ghostId: ghostId,
      newNodeId: node.nodeId,
      label: title,
      filePath: relativePath,
      type: 'note',
      createdAt: now,
      updatedAt: now,
    });

    // Edge replace operations
    for (const edge of convertedEdges) {
      ops.push({
        op: 'edge_replace',
        newEdgeId: edge.edgeId,
        fromId: edge.sourceId,
        toId: edge.targetId,
        type: edge.edgeType,
      });
    }

    // Track recent creation
    this.recentCreations.set(ghostId, {
      newNodeId: node.nodeId,
      title: title,
      createdAt: now,
    });

    // Send patch to all connected clients
    this.broadcast({
      type: 'patch',
      patchSeq: ++session.patchSeq,
      ops,
    });

    // Send success ack
    this.send(session, {
      type: 'create_ack',
      ghostId: ghostId,
      status: 'success',
    });

    console.log(`[WS] Created note "${title}" at ${relativePath}`);
  }

  /**
   * Handle linking ghost to an existing node
   */
  private async handleLinkToExisting(
    session: ClientSession,
    message: CreateFromGhostMessage,
    existingNode: {
      nodeId: string;
      title: string;
      path: string;
      type: string;
      createdAt: string;
      updatedAt: string;
    }
  ): Promise<void> {
    const { ghostId, title } = message;

    // Convert unresolved links to explicit_link edges
    const convertedEdges = await this.convertUnresolvedLinks(ghostId, existingNode.nodeId, title);

    // Build patch operations
    const ops: PatchOp[] = [];

    // Node replace operation with linkedExisting flag
    ops.push({
      op: 'node_replace',
      ghostId: ghostId,
      newNodeId: existingNode.nodeId,
      label: existingNode.title,
      filePath: existingNode.path,
      type: existingNode.type,
      createdAt: existingNode.createdAt,
      updatedAt: existingNode.updatedAt,
      linkedExisting: true,
    });

    // Edge replace operations
    for (const edge of convertedEdges) {
      ops.push({
        op: 'edge_replace',
        newEdgeId: edge.edgeId,
        fromId: edge.sourceId,
        toId: edge.targetId,
        type: edge.edgeType,
      });
    }

    // Track recent creation (even though it's linking to existing)
    this.recentCreations.set(ghostId, {
      newNodeId: existingNode.nodeId,
      title: existingNode.title,
      createdAt: new Date().toISOString(),
    });

    // Broadcast patch
    this.broadcast({
      type: 'patch',
      patchSeq: ++session.patchSeq,
      ops,
    });

    // Send success ack
    this.send(session, {
      type: 'create_ack',
      ghostId: ghostId,
      status: 'success',
    });

    console.log(`[WS] Linked ghost "${title}" to existing node "${existingNode.title}"`);
  }

  /**
   * Convert unresolved links for a ghost to explicit_link edges
   */
  private async convertUnresolvedLinks(
    ghostId: string,
    targetNodeId: string,
    targetText: string
  ): Promise<Array<{ edgeId: string; sourceId: string; targetId: string; edgeType: string }>> {
    const edges: Array<{ edgeId: string; sourceId: string; targetId: string; edgeType: string }> =
      [];

    // Get unresolved links for this target text
    const ghostNodes = await this.ctx.unresolvedLinkRepository.getGhostNodes();
    const ghostNode = ghostNodes.find(
      (g) =>
        `ghost:${g.targetText}` === ghostId ||
        g.targetText.toLowerCase() === targetText.toLowerCase()
    );

    if (!ghostNode) {
      return edges;
    }

    // Create explicit_link edges for each source
    for (const sourceId of ghostNode.sourceIds) {
      const edge = await this.ctx.edgeRepository.create({
        sourceId: sourceId,
        targetId: targetNodeId,
        edgeType: 'explicit_link',
        provenance: 'explicit',
        attributes: {
          convertedFrom: 'unresolved_link',
          originalGhostId: ghostId,
        },
      });

      edges.push({
        edgeId: edge.edgeId,
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        edgeType: edge.edgeType,
      });
    }

    // Note: We don't delete unresolved_links here as the background indexer
    // will handle that on the next reindex. This ensures eventual consistency.

    return edges;
  }

  /**
   * Handle sync request (for reconnection)
   */
  private async handleSyncRequest(
    session: ClientSession,
    message: SyncRequestMessage
  ): Promise<void> {
    if (!session.authenticated) {
      this.sendError(session, 'Not authenticated');
      return;
    }

    if (message.sessionNonce !== session.sessionNonce) {
      this.sendError(session, 'Invalid session nonce');
      return;
    }

    // Get current unresolved links
    const ghostNodes = await this.ctx.unresolvedLinkRepository.getGhostNodes();

    const unresolvedList: GhostNodeInfo[] = ghostNodes.map((g) => ({
      ghostId: `ghost:${g.targetText}`,
      title: g.targetText,
      referenceCount: g.referenceCount,
      sourceIds: g.sourceIds,
      firstSeen: g.firstSeen,
    }));

    // Get recent creations from this session
    const recentCreations = Array.from(this.recentCreations.entries()).map(([ghostId, info]) => ({
      ghostId,
      newNodeId: info.newNodeId,
      title: info.title,
      createdAt: info.createdAt,
    }));

    this.send(session, {
      type: 'sync_response',
      unresolvedList,
      recentCreations,
    });
  }

  /**
   * Sanitize a filename
   */
  private sanitizeFilename(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .slice(0, 200); // Limit length
  }

  /**
   * Send a message to a specific session
   */
  private send(session: ClientSession, message: ServerToClientMessage): void {
    if (session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(serializeServerMessage(message));
    }
  }

  /**
   * Send an error message
   */
  private sendError(session: ClientSession, message: string, ghostId?: string): void {
    const errorMsg: { type: 'error'; message: string; ghostId?: string } = {
      type: 'error',
      message,
    };
    if (ghostId !== undefined) {
      errorMsg.ghostId = ghostId;
    }
    this.send(session, errorMsg);
  }

  /**
   * Broadcast a message to all authenticated sessions
   */
  private broadcast(message: ServerToClientMessage): void {
    for (const session of this.sessions.values()) {
      if (session.authenticated) {
        this.send(session, message);
      }
    }
  }

  /**
   * Start the server
   */
  async start(): Promise<ServerInfo> {
    return new Promise((resolve, reject) => {
      // Bind to localhost only on port 0 for auto-selection
      this.server.listen(0, '127.0.0.1', () => {
        const addr = this.server.address();
        if (typeof addr === 'object' && addr) {
          const port = addr.port;
          console.log(`[WS] Server listening on 127.0.0.1:${port}`);
          resolve({
            port,
            token: this.token,
            tokenExpiry: this.tokenExpiry,
          });
        } else {
          reject(new Error('Failed to get server address'));
        }
      });

      this.server.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      // Close all WebSocket connections
      for (const session of this.sessions.values()) {
        session.ws.close(1000, 'Server shutting down');
      }
      this.sessions.clear();

      // Close WebSocket server
      this.wss.close(() => {
        // Close HTTP server
        this.server.close(() => {
          console.log('[WS] Server stopped');
          resolve();
        });
      });
    });
  }

  /**
   * Refresh the auth token
   */
  refreshToken(): string {
    this.token = generateToken();
    this.tokenExpiry = Date.now() + TOKEN_VALIDITY_MS;
    return this.token;
  }
}

/**
 * Create and start a visualize server
 */
export async function createVisualizeServer(
  ctx: CLIContext,
  options?: { onClose?: () => void }
): Promise<{ server: VisualizeServer; info: ServerInfo }> {
  const server = new VisualizeServer({
    ctx,
    onClose: options?.onClose,
  });

  const info = await server.start();
  return { server, info };
}
