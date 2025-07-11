/**
 * Query Results Viewer - Display ES|QL query results
 */
import { QueryResult } from '../esql/template-types.js';
export interface ResultsViewerOptions {
    container: HTMLElement;
    onClose?: () => void;
}
export declare class QueryResultsViewer {
    private options;
    private modalElement;
    constructor(options: ResultsViewerOptions);
    /**
     * Display query results
     */
    displayResults(result: QueryResult, title?: string): void;
    /**
     * Render results based on type
     */
    private renderResults;
    /**
     * Render data as table
     */
    private renderTable;
    /**
     * Render time series data as chart placeholder
     */
    private renderTimeSeries;
    /**
     * Render single object
     */
    private renderObject;
    /**
     * Format column name for display
     */
    private formatColumnName;
    /**
     * Format cell value based on type and column
     */
    private formatCellValue;
    /**
     * Render status with color coding
     */
    private renderStatus;
    /**
     * Render query metadata
     */
    private renderMetadata;
    /**
     * Apply modal styles
     */
    private applyStyles;
    /**
     * Attach event listeners
     */
    private attachEventListeners;
    /**
     * Export results as CSV
     */
    private exportCSV;
    /**
     * Copy query to clipboard
     */
    private copyQuery;
    /**
     * Close the modal
     */
    close(): void;
}
//# sourceMappingURL=query-results-viewer.d.ts.map