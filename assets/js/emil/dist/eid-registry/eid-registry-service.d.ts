/**
 * EID Registry Service
 * Manages EID classification, registration, and metrics storage
 */
import { EIDRecord, EIDType, EIDStatus, EIDMetrics, EIDWithMetrics, EIDRegistrationRequest, EIDUpdateRequest, EIDSearchFilters, EIDRegistryStats, BatchOperationResult } from './types.js';
/**
 * EID Registry Service class
 * Provides methods for managing EID records and their metrics
 */
export declare class EIDRegistryService {
    private apiEndpoint;
    constructor(apiEndpoint?: string);
    /**
     * Register a new EID
     */
    registerEID(request: EIDRegistrationRequest): Promise<EIDRecord>;
    /**
     * Get EID by ID
     */
    getEID(id: string): Promise<EIDWithMetrics | null>;
    /**
     * Update an existing EID
     */
    updateEID(id: string, update: EIDUpdateRequest): Promise<EIDRecord>;
    /**
     * Delete an EID
     */
    deleteEID(id: string): Promise<void>;
    /**
     * Search EIDs with filters
     */
    searchEIDs(filters?: EIDSearchFilters): Promise<EIDWithMetrics[]>;
    /**
     * Get all EIDs (paginated)
     */
    getAllEIDs(page?: number, limit?: number): Promise<{
        data: EIDWithMetrics[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Store metrics for an EID
     */
    storeMetrics(eidId: string, metrics: Omit<EIDMetrics, 'eid_id' | 'calculated_at'>): Promise<EIDMetrics>;
    /**
     * Get metrics history for an EID
     */
    getMetricsHistory(eidId: string, options?: {
        limit?: number;
        startDate?: Date;
        endDate?: Date;
        queryTemplate?: string;
    }): Promise<EIDMetrics[]>;
    /**
     * Batch register multiple EIDs
     */
    batchRegister(requests: EIDRegistrationRequest[]): Promise<BatchOperationResult>;
    /**
     * Batch update EID status
     */
    batchUpdateStatus(eidIds: string[], status: EIDStatus): Promise<BatchOperationResult>;
    /**
     * Get registry statistics
     */
    getStats(): Promise<EIDRegistryStats>;
    /**
     * Export EIDs to CSV
     */
    exportToCSV(filters?: EIDSearchFilters): Promise<Blob>;
    /**
     * Validate EID registration request
     */
    private validateRegistrationRequest;
    /**
     * Get EID type from classification flags
     */
    static getEIDType(is_rad: boolean, is_experiment: boolean): EIDType;
    /**
     * Get human-readable type label
     */
    static getTypeLabel(type: EIDType): string;
    /**
     * Get status color for UI
     */
    static getStatusColor(status: EIDStatus): string;
    /**
     * Get health status color
     */
    static getHealthStatusColor(status: string): string;
}
//# sourceMappingURL=eid-registry-service.d.ts.map