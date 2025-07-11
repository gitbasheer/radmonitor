/**
 * EMIL (EID-Centric Monitoring Intelligence Layer) - Phase 1
 * Main entry point for EMIL components
 */
// Core components
export { RadixTrie } from './trie/radix-trie.js';
export { EIDRegistry } from './eid-registry/eid-registry.js';
export { EIDParser } from './utils/eid-parser.js';
// UI components
export { VirtualScroll } from './ui/virtual-scroll.js';
export { EIDSelector } from './ui/eid-selector.js';
// Types
export * from './types/index.js';
// Import classes for internal use
import { EIDRegistry } from './eid-registry/eid-registry.js';
import { EIDSelector } from './ui/eid-selector.js';
// Version
export const EMIL_VERSION = '1.0.0';
/**
 * Initialize EMIL with mock data for testing
 */
export async function initializeEMIL(options) {
    const registry = new EIDRegistry();
    // Load mock data if requested
    if (options?.mockData) {
        const mockEIDs = generateMockEIDs();
        await registry.initialize(mockEIDs);
    }
    // Create selector if container provided
    let selector;
    if (options?.container) {
        selector = new EIDSelector({
            container: options.container,
            registry,
            onSelect: (eids) => {
                console.log('Selected EIDs:', eids);
            },
            onSelectionChange: (eids) => {
                console.log('Selection changed:', eids.length, 'EIDs');
            }
        });
    }
    return { registry, selector };
}
/**
 * Generate mock EID data for testing
 */
function generateMockEIDs() {
    const namespaces = ['pandc', 'platform', 'commerce'];
    const radsets = ['vnext', 'legacy', 'experimental'];
    const radIds = [
        'recommendations', 'discovery', 'search', 'feed',
        'cart', 'checkout', 'profile', 'notifications'
    ];
    const subactions = ['view', 'click', 'impression', 'purchase', 'add', 'remove'];
    const actions = ['success', 'failure', 'timeout', 'cancelled'];
    const mockData = [];
    let idCounter = 0;
    for (const namespace of namespaces) {
        for (const radset of radsets) {
            for (const radId of radIds) {
                // Base EID
                const baseEid = `${namespace}.${radset}.${radId}`;
                mockData.push({
                    eid: baseEid,
                    namespace,
                    radset,
                    radId,
                    lastSeen: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
                    frequency: Math.floor(Math.random() * 10000),
                    avgResponseTime: Math.random() * 2000,
                    errorRate: Math.random() * 0.1,
                    description: `${radId} events for ${namespace}`,
                    tags: [namespace, radset, radId]
                });
                // Add variations with subactions
                for (let i = 0; i < Math.min(3, subactions.length); i++) {
                    const subaction = subactions[Math.floor(Math.random() * subactions.length)];
                    const action = Math.random() > 0.5 ? actions[Math.floor(Math.random() * actions.length)] : undefined;
                    const eid = action ? `${baseEid}.${subaction}.${action}` : `${baseEid}.${subaction}`;
                    mockData.push({
                        eid,
                        namespace,
                        radset,
                        radId,
                        subaction,
                        action,
                        lastSeen: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
                        frequency: Math.floor(Math.random() * 1000),
                        avgResponseTime: Math.random() * 1500,
                        errorRate: Math.random() * 0.05,
                        description: `${subaction} ${action || ''} for ${radId}`,
                        tags: [namespace, radset, radId, subaction].filter((tag) => tag !== undefined)
                    });
                }
                idCounter++;
                if (idCounter > 10000)
                    break;
            }
            if (idCounter > 10000)
                break;
        }
        if (idCounter > 10000)
            break;
    }
    return mockData;
}
//# sourceMappingURL=index.js.map