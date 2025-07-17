/**
 * Query Panel - Quick actions for selected EIDs
 * Provides UI for executing predefined queries on selected EIDs
 */
import { ESQLExecutor } from '../services/esql-executor.js';
export interface QueryPanelOptions {
    container: HTMLElement;
    executor: ESQLExecutor;
    onQueryStart?: () => void;
    onQueryComplete?: () => void;
}
export declare class QueryPanel {
    private options;
    private selectedEIDs;
    private resultsViewer;
    private isLoading;
    constructor(options: QueryPanelOptions);
    /**
     * Update selected EIDs
     */
    updateEIDs(eids: string[]): void;
    /**
     * Render the query panel
     */
    private render;
    /**
     * Apply panel styles
     */
    private applyStyles;
    /**
     * Attach event listeners
     */
    private attachEventListeners;
    /**
     * Update UI based on selected EIDs
     */
    private updateUI;
    /**
     * Execute query based on action
     */
    private executeQuery;
    /**
     * Build parameters based on action and UI selections
     */
    private buildParameters;
    /**
     * Map action to template ID
     */
    private mapActionToTemplate;
    /**
     * Expand time window for trend analysis
     */
    private expandTimeWindow;
    /**
     * Calculate appropriate bucket size
     */
    private calculateBucketSize;
}
//# sourceMappingURL=query-panel.d.ts.map