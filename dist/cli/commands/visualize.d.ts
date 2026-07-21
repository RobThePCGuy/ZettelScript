import { Command } from 'commander';
import type { Constellation } from '../../storage/database/repositories/index.js';
import { type DoctorStats } from './doctor.js';
import type { FocusBundle } from '../../discovery/focus-bundle.js';
export declare const typeColors: Record<string, string>;
export declare const edgeStyles: Record<string, {
    color: string;
    dash: number[];
    label: string;
}>;
export interface GraphNode {
    id: string;
    name: string;
    type: string;
    val: number;
    color: string;
    path: string;
    metadata: Record<string, unknown>;
    updatedAtMs?: number | undefined;
    isGhost?: boolean;
    sourceIds?: string[];
    referenceCount?: number;
    mostRecentRef?: string | undefined;
}
export interface WebSocketConfig {
    enabled: boolean;
    port: number;
    token: string;
    protocolVersion: string;
}
export interface GraphLink {
    source: string;
    target: string;
    type: string;
    strength?: number;
    provenance?: string;
}
export interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
}
export interface PathData {
    paths: Array<{
        path: string[];
        edges: string[];
        hopCount: number;
        score: number;
    }>;
    fromId: string;
    toId: string;
    fromLabel: string;
    toLabel: string;
}
export declare function generateVisualizationHtml(graphData: GraphData, nodeTypeColors: Record<string, string>, constellation?: Constellation | null, pathData?: PathData | null, wsConfig?: WebSocketConfig | null, statusData?: DoctorStats | null, focusBundle?: FocusBundle | null): string;
export declare const visualizeCommand: Command;
//# sourceMappingURL=visualize.d.ts.map