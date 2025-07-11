/**
 * EMIL (EID-Centric Monitoring Intelligence Layer) - Phase 1
 * Main entry point for EMIL components
 */
export { RadixTrie } from './trie/radix-trie.js';
export { EIDRegistry } from './eid-registry/eid-registry.js';
export { EIDParser } from './utils/eid-parser.js';
export { VirtualScroll } from './ui/virtual-scroll.js';
export { EIDSelector } from './ui/eid-selector.js';
export * from './types/index.js';
import { EIDRegistry } from './eid-registry/eid-registry.js';
import { EIDSelector } from './ui/eid-selector.js';
export declare const EMIL_VERSION = "1.0.0";
/**
 * Initialize EMIL with mock data for testing
 */
export declare function initializeEMIL(options?: {
    container?: HTMLElement;
    mockData?: boolean;
}): Promise<{
    registry: EIDRegistry;
    selector?: EIDSelector;
}>;
//# sourceMappingURL=index.d.ts.map