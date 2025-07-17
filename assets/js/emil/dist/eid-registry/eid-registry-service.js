/**
 * EID Registry Service
 * Manages EID classification, registration, and metrics storage
 */
import { EIDType, EIDStatus } from './types.js';
/**
 * EID Registry Service class
 * Provides methods for managing EID records and their metrics
 */
export class EIDRegistryService {
    constructor(apiEndpoint = '/api/eid-registry') {
        this.apiEndpoint = apiEndpoint;
    }
    /**
     * Register a new EID
     */
    async registerEID(request) {
        // Validate the request
        this.validateRegistrationRequest(request);
        const response = await fetch(`${this.apiEndpoint}/eids`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to register EID');
        }
        return response.json();
    }
    /**
     * Get EID by ID
     */
    async getEID(id) {
        const response = await fetch(`${this.apiEndpoint}/eids/${encodeURIComponent(id)}`);
        if (response.status === 404) {
            return null;
        }
        if (!response.ok) {
            throw new Error('Failed to fetch EID');
        }
        return response.json();
    }
    /**
     * Update an existing EID
     */
    async updateEID(id, update) {
        const response = await fetch(`${this.apiEndpoint}/eids/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(update),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update EID');
        }
        return response.json();
    }
    /**
     * Delete an EID
     */
    async deleteEID(id) {
        const response = await fetch(`${this.apiEndpoint}/eids/${encodeURIComponent(id)}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error('Failed to delete EID');
        }
    }
    /**
     * Search EIDs with filters
     */
    async searchEIDs(filters = {}) {
        const queryParams = new URLSearchParams();
        // Build query parameters
        if (filters.type !== undefined) {
            queryParams.append('type', filters.type.toString());
        }
        if (filters.status) {
            queryParams.append('status', filters.status);
        }
        if (filters.tags && filters.tags.length > 0) {
            filters.tags.forEach(tag => queryParams.append('tag', tag));
        }
        if (filters.owner) {
            queryParams.append('owner', filters.owner);
        }
        if (filters.search) {
            queryParams.append('q', filters.search);
        }
        if (filters.has_metrics !== undefined) {
            queryParams.append('has_metrics', filters.has_metrics.toString());
        }
        if (filters.health_status && filters.health_status.length > 0) {
            filters.health_status.forEach(status => queryParams.append('health_status', status));
        }
        const response = await fetch(`${this.apiEndpoint}/eids?${queryParams}`);
        if (!response.ok) {
            throw new Error('Failed to search EIDs');
        }
        return response.json();
    }
    /**
     * Get all EIDs (paginated)
     */
    async getAllEIDs(page = 1, limit = 100) {
        const response = await fetch(`${this.apiEndpoint}/eids?page=${page}&limit=${limit}`);
        if (!response.ok) {
            throw new Error('Failed to fetch EIDs');
        }
        return response.json();
    }
    /**
     * Store metrics for an EID
     */
    async storeMetrics(eidId, metrics) {
        const response = await fetch(`${this.apiEndpoint}/eids/${encodeURIComponent(eidId)}/metrics`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(metrics),
        });
        if (!response.ok) {
            throw new Error('Failed to store metrics');
        }
        return response.json();
    }
    /**
     * Get metrics history for an EID
     */
    async getMetricsHistory(eidId, options = {}) {
        const queryParams = new URLSearchParams();
        if (options.limit) {
            queryParams.append('limit', options.limit.toString());
        }
        if (options.startDate) {
            queryParams.append('start', options.startDate.toISOString());
        }
        if (options.endDate) {
            queryParams.append('end', options.endDate.toISOString());
        }
        if (options.queryTemplate) {
            queryParams.append('template', options.queryTemplate);
        }
        const response = await fetch(`${this.apiEndpoint}/eids/${encodeURIComponent(eidId)}/metrics?${queryParams}`);
        if (!response.ok) {
            throw new Error('Failed to fetch metrics history');
        }
        return response.json();
    }
    /**
     * Batch register multiple EIDs
     */
    async batchRegister(requests) {
        const response = await fetch(`${this.apiEndpoint}/eids/batch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ eids: requests }),
        });
        if (!response.ok) {
            throw new Error('Failed to batch register EIDs');
        }
        return response.json();
    }
    /**
     * Batch update EID status
     */
    async batchUpdateStatus(eidIds, status) {
        const response = await fetch(`${this.apiEndpoint}/eids/batch/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ eids: eidIds, status }),
        });
        if (!response.ok) {
            throw new Error('Failed to batch update status');
        }
        return response.json();
    }
    /**
     * Get registry statistics
     */
    async getStats() {
        const response = await fetch(`${this.apiEndpoint}/stats`);
        if (!response.ok) {
            throw new Error('Failed to fetch registry stats');
        }
        return response.json();
    }
    /**
     * Export EIDs to CSV
     */
    async exportToCSV(filters = {}) {
        const queryParams = new URLSearchParams();
        // Add filters
        if (filters.type !== undefined) {
            queryParams.append('type', filters.type.toString());
        }
        if (filters.status) {
            queryParams.append('status', filters.status);
        }
        const response = await fetch(`${this.apiEndpoint}/export?${queryParams}`, {
            headers: {
                'Accept': 'text/csv',
            },
        });
        if (!response.ok) {
            throw new Error('Failed to export EIDs');
        }
        return response.blob();
    }
    /**
     * Validate EID registration request
     */
    validateRegistrationRequest(request) {
        if (!request.id || request.id.trim().length === 0) {
            throw new Error('EID ID is required');
        }
        if (!request.name || request.name.trim().length === 0) {
            throw new Error('EID name is required');
        }
        if (!request.is_rad && !request.is_experiment) {
            throw new Error('EID must be classified as either RAD, experiment, or both');
        }
        // Validate ID format (should match Elasticsearch field pattern)
        const idPattern = /^[\w\-\.]+$/;
        if (!idPattern.test(request.id)) {
            throw new Error('Invalid EID ID format');
        }
    }
    /**
     * Get EID type from classification flags
     */
    static getEIDType(is_rad, is_experiment) {
        if (is_rad && is_experiment) {
            return EIDType.RAD_AND_EXPERIMENT;
        }
        else if (is_rad) {
            return EIDType.RAD_ONLY;
        }
        else if (is_experiment) {
            return EIDType.EXPERIMENT_ONLY;
        }
        else {
            throw new Error('Invalid EID classification');
        }
    }
    /**
     * Get human-readable type label
     */
    static getTypeLabel(type) {
        switch (type) {
            case EIDType.EXPERIMENT_ONLY:
                return 'Experiment';
            case EIDType.RAD_ONLY:
                return 'RAD';
            case EIDType.RAD_AND_EXPERIMENT:
                return 'RAD & Experiment';
            default:
                return 'Unknown';
        }
    }
    /**
     * Get status color for UI
     */
    static getStatusColor(status) {
        switch (status) {
            case EIDStatus.TESTING:
                return '#FFA500'; // Orange
            case EIDStatus.LIVE:
                return '#00C851'; // Green
            case EIDStatus.OLD:
                return '#9E9E9E'; // Gray
            default:
                return '#000000';
        }
    }
    /**
     * Get health status color
     */
    static getHealthStatusColor(status) {
        switch (status?.toUpperCase()) {
            case 'HEALTHY':
                return '#00C851'; // Green
            case 'WARNING':
                return '#FFA500'; // Orange
            case 'CRITICAL':
                return '#FF4444'; // Red
            case 'LOW_TRAFFIC':
                return '#33B5E5'; // Blue
            case 'SLOW':
                return '#FFBB33'; // Yellow
            default:
                return '#9E9E9E'; // Gray
        }
    }
}
//# sourceMappingURL=eid-registry-service.js.map