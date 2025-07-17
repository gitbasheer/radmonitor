/**
 * Integration Example
 * Demonstrates how to use the query engine with EID registry
 */
import { ESQLQueryBuilder, QueryExecutor, QueryErrorFactory } from './query-engine/index.js';
import { EIDRegistryService, EIDMetricsStore, EIDType, EIDStatus } from './eid-registry/index.js';
/**
 * Example: Complete workflow from EID registration to query execution and metrics storage
 */
export async function completeWorkflowExample() {
    // Initialize services
    const registryService = new EIDRegistryService('/api/eid-registry');
    const metricsStore = new EIDMetricsStore(registryService);
    try {
        // Step 1: Register a new EID
        console.log('Step 1: Registering new EID...');
        const newEID = await registryService.registerEID({
            id: 'eid-checkout-v2',
            name: 'Checkout Flow V2 Experiment',
            is_rad: true,
            is_experiment: true,
            status: EIDStatus.TESTING,
            description: 'New checkout flow with improved UX and RAD tracking',
            tags: ['checkout', 'experiment', 'revenue'],
            owner: 'revenue-team'
        });
        console.log('Registered:', newEID);
        // Step 2: Build and execute a health check query
        console.log('\nStep 2: Running health check...');
        const healthQuery = ESQLQueryBuilder.buildFromIntent({
            action: 'health-check',
            eids: [newEID.id],
            parameters: {
                time_window: '1h'
            }
        });
        const healthResult = await QueryExecutor.execute(healthQuery, {
            enableCache: true,
            cacheTTL: 60
        });
        // Step 3: Automatically store the metrics
        console.log('\nStep 3: Storing metrics...');
        await metricsStore.processQueryResult(healthResult, 'healthCheck', '1h');
        // Step 4: Retrieve the EID with its latest metrics
        console.log('\nStep 4: Retrieving EID with metrics...');
        const eidWithMetrics = await registryService.getEID(newEID.id);
        console.log('EID with metrics:', eidWithMetrics);
        // Step 5: Run a baseline comparison
        console.log('\nStep 5: Running baseline comparison...');
        const baselineQuery = ESQLQueryBuilder.buildFromTemplate('baselineComparison', {
            eids: [newEID.id],
            baseline_start: '2024-01-01T00:00:00Z',
            baseline_end: '2024-01-07T23:59:59Z',
            current_window: '24h',
            traffic_drop_threshold: 20
        });
        const baselineResult = await QueryExecutor.execute(baselineQuery);
        await metricsStore.processQueryResult(baselineResult, 'baselineComparison', '24h');
        // Step 6: Search for all RAD-enabled EIDs with issues
        console.log('\nStep 6: Finding problematic RAD EIDs...');
        const problematicEIDs = await registryService.searchEIDs({
            type: EIDType.RAD_ONLY,
            health_status: ['WARNING', 'CRITICAL'],
            status: EIDStatus.LIVE
        });
        console.log(`Found ${problematicEIDs.length} problematic RAD EIDs`);
        // Step 7: Batch update status for old EIDs
        console.log('\nStep 7: Updating old EIDs...');
        const oldEIDs = await registryService.searchEIDs({
            status: EIDStatus.TESTING,
            has_metrics: false
        });
        if (oldEIDs.length > 0) {
            const eidIds = oldEIDs.map(e => e.id);
            const batchResult = await registryService.batchUpdateStatus(eidIds, EIDStatus.OLD);
            console.log('Batch update result:', batchResult);
        }
        // Step 8: Get registry statistics
        console.log('\nStep 8: Getting registry stats...');
        const stats = await registryService.getStats();
        console.log('Registry statistics:', stats);
    }
    catch (error) {
        console.error('Workflow error:', QueryErrorFactory.getUserMessage(error));
    }
}
/**
 * Example: Query all EIDs of a specific type and store their metrics
 */
export async function batchMetricsExample() {
    const registryService = new EIDRegistryService('/api/eid-registry');
    const metricsStore = new EIDMetricsStore(registryService);
    try {
        // Get all live RAD EIDs
        const radEIDs = await registryService.searchEIDs({
            type: EIDType.RAD_ONLY,
            status: EIDStatus.LIVE
        });
        console.log(`Processing ${radEIDs.length} RAD EIDs...`);
        // Build performance metrics query for all RAD EIDs
        const eidIds = radEIDs.map(e => e.id);
        const query = ESQLQueryBuilder.buildFromTemplate('performanceMetrics', {
            eids: eidIds,
            time_window: '6h',
            timeout_threshold: 3000,
            critical_latency: 2000
        });
        // Execute with extended timeout for large query
        const result = await QueryExecutor.execute(query, {
            timeout: 60000,
            enableCache: false // Don't cache large result sets
        });
        // Process and store metrics
        await metricsStore.processQueryResult(result, 'performanceMetrics', '6h');
        console.log('Metrics updated for all RAD EIDs');
    }
    catch (error) {
        console.error('Batch processing error:', error);
    }
}
/**
 * Example: Monitor EID health continuously
 */
export async function continuousMonitoringExample() {
    const registryService = new EIDRegistryService('/api/eid-registry');
    const metricsStore = new EIDMetricsStore(registryService);
    // Function to check health of all live EIDs
    const checkHealth = async () => {
        try {
            const liveEIDs = await registryService.searchEIDs({
                status: EIDStatus.LIVE
            });
            const eidIds = liveEIDs.map(e => e.id);
            // Build health check query
            const query = ESQLQueryBuilder.buildFromIntent({
                action: 'health-check',
                eids: eidIds,
                parameters: {
                    time_window: '15m',
                    critical_error_threshold: 0.05,
                    warning_error_threshold: 0.02
                }
            });
            // Execute query
            const result = await QueryExecutor.execute(query, {
                enableCache: true,
                cacheTTL: 60 // Cache for 1 minute
            });
            // Store metrics
            await metricsStore.processQueryResult(result, 'healthCheck', '15m');
            // Check for critical EIDs
            if (result.data && Array.isArray(result.data)) {
                const criticalEIDs = result.data.filter((r) => r.health_status === 'CRITICAL');
                if (criticalEIDs.length > 0) {
                    console.warn(`ALERT: ${criticalEIDs.length} EIDs in critical state!`);
                    criticalEIDs.forEach((eid) => {
                        console.warn(`- ${eid.eid}: ${eid.error_rate * 100}% errors`);
                    });
                }
            }
            console.log(`Health check completed at ${new Date().toISOString()}`);
        }
        catch (error) {
            console.error('Health check failed:', error);
        }
    };
    // Run health check every 5 minutes
    console.log('Starting continuous monitoring...');
    checkHealth(); // Run immediately
    setInterval(checkHealth, 5 * 60 * 1000);
}
/**
 * Example: Create a custom dashboard data source
 */
export async function dashboardDataExample() {
    const registryService = new EIDRegistryService('/api/eid-registry');
    try {
        // Get all EIDs with their latest metrics
        const allEIDs = await registryService.getAllEIDs(1, 1000);
        // Group by type and status
        const dashboard = {
            summary: {
                total: allEIDs.total,
                healthy: 0,
                warning: 0,
                critical: 0,
                unknown: 0
            },
            byType: {
                experiment: [],
                rad: [],
                both: []
            },
            topPerformers: [],
            needsAttention: []
        };
        // Process EIDs
        allEIDs.data.forEach(eid => {
            // Update summary
            if (eid.latest_metrics?.health_status) {
                switch (eid.latest_metrics.health_status) {
                    case 'HEALTHY':
                        dashboard.summary.healthy++;
                        break;
                    case 'WARNING':
                        dashboard.summary.warning++;
                        break;
                    case 'CRITICAL':
                        dashboard.summary.critical++;
                        break;
                    default:
                        dashboard.summary.unknown++;
                }
            }
            else {
                dashboard.summary.unknown++;
            }
            // Group by type
            switch (eid.type) {
                case EIDType.EXPERIMENT_ONLY:
                    dashboard.byType.experiment.push(eid);
                    break;
                case EIDType.RAD_ONLY:
                    dashboard.byType.rad.push(eid);
                    break;
                case EIDType.RAD_AND_EXPERIMENT:
                    dashboard.byType.both.push(eid);
                    break;
            }
            // Identify top performers and problematic EIDs
            if (eid.latest_metrics) {
                if (eid.latest_metrics.health_score && eid.latest_metrics.health_score >= 95) {
                    dashboard.topPerformers.push(eid);
                }
                if (eid.latest_metrics.health_status === 'CRITICAL' ||
                    eid.latest_metrics.health_status === 'WARNING') {
                    dashboard.needsAttention.push(eid);
                }
            }
        });
        // Sort lists
        dashboard.topPerformers.sort((a, b) => (b.latest_metrics?.health_score || 0) - (a.latest_metrics?.health_score || 0));
        dashboard.needsAttention.sort((a, b) => (a.latest_metrics?.health_score || 100) - (b.latest_metrics?.health_score || 100));
        return dashboard;
    }
    catch (error) {
        console.error('Failed to generate dashboard data:', error);
        throw error;
    }
}
//# sourceMappingURL=integration-example.js.map