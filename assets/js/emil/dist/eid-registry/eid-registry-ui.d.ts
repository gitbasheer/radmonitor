/**
 * EID Registry UI Component
 * Provides interface for managing EID classifications and viewing metrics
 */
import { EIDRegistryService } from './eid-registry-service.js';
import { EIDWithMetrics } from './types.js';
export interface EIDRegistryUIOptions {
    container: HTMLElement;
    registryService: EIDRegistryService;
    onEIDSelect?: (eid: EIDWithMetrics) => void;
    onEIDsUpdate?: (eids: EIDWithMetrics[]) => void;
}
export declare class EIDRegistryUI {
    private options;
    private currentEIDs;
    private selectedEIDs;
    private currentFilters;
    private isLoading;
    constructor(options: EIDRegistryUIOptions);
    /**
     * Render the EID registry UI
     */
    private render;
    /**
     * Apply component styles
     */
    private applyStyles;
    /**
     * Attach event listeners
     */
    private attachEventListeners;
    /**
     * Load EIDs from the registry
     */
    private loadEIDs;
    /**
     * Render EID cards
     */
    private renderEIDs;
    /**
     * Render individual EID card
     */
    private renderEIDCard;
    /**
     * Update statistics display
     */
    private updateStats;
    /**
     * Select an EID
     */
    private selectEID;
    /**
     * Show registration modal
     */
    private showRegistrationModal;
    /**
     * Hide registration modal
     */
    private hideRegistrationModal;
    /**
     * Handle EID registration
     */
    private handleRegistration;
    /**
     * Reset registration form
     */
    private resetRegistrationForm;
    /**
     * Export EIDs to CSV
     */
    private exportEIDs;
    /**
     * Show loading state
     */
    private showLoading;
    /**
     * Show error message
     */
    private showError;
    /**
     * Show success message
     */
    private showSuccess;
    /**
     * Format number
     */
    private formatNumber;
    /**
     * Format latency
     */
    private formatLatency;
    /**
     * Format percentage
     */
    private formatPercentage;
    /**
     * Debounce utility
     */
    private debounce;
    /**
     * Get selected EIDs
     */
    getSelectedEIDs(): string[];
    /**
     * Clear selection
     */
    clearSelection(): void;
}
//# sourceMappingURL=eid-registry-ui.d.ts.map