/**
 * EID Registry Service
 * Manages EID classification, registration, and metrics storage
 */

import { 
  EIDRecord, 
  EIDType, 
  EIDStatus, 
  EIDMetrics,
  EIDWithMetrics,
  EIDRegistrationRequest,
  EIDUpdateRequest,
  EIDSearchFilters,
  EIDRegistryStats,
  BatchOperationResult
} from './types.js';

/**
 * EID Registry Service class
 * Provides methods for managing EID records and their metrics
 */
export class EIDRegistryService {
  private apiEndpoint: string;

  constructor(apiEndpoint: string = '/api/eid-registry') {
    this.apiEndpoint = apiEndpoint;
  }

  /**
   * Register a new EID
   */
  async registerEID(request: EIDRegistrationRequest): Promise<EIDRecord> {
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
  async getEID(id: string): Promise<EIDWithMetrics | null> {
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
  async updateEID(id: string, update: EIDUpdateRequest): Promise<EIDRecord> {
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
  async deleteEID(id: string): Promise<void> {
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
  async searchEIDs(filters: EIDSearchFilters = {}): Promise<EIDWithMetrics[]> {
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
  async getAllEIDs(page: number = 1, limit: number = 100): Promise<{
    data: EIDWithMetrics[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await fetch(`${this.apiEndpoint}/eids?page=${page}&limit=${limit}`);

    if (!response.ok) {
      throw new Error('Failed to fetch EIDs');
    }

    return response.json();
  }

  /**
   * Store metrics for an EID
   */
  async storeMetrics(eidId: string, metrics: Omit<EIDMetrics, 'eid_id' | 'calculated_at'>): Promise<EIDMetrics> {
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
  async getMetricsHistory(
    eidId: string, 
    options: {
      limit?: number;
      startDate?: Date;
      endDate?: Date;
      queryTemplate?: string;
    } = {}
  ): Promise<EIDMetrics[]> {
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

    const response = await fetch(
      `${this.apiEndpoint}/eids/${encodeURIComponent(eidId)}/metrics?${queryParams}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch metrics history');
    }

    return response.json();
  }

  /**
   * Batch register multiple EIDs
   */
  async batchRegister(requests: EIDRegistrationRequest[]): Promise<BatchOperationResult> {
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
  async batchUpdateStatus(eidIds: string[], status: EIDStatus): Promise<BatchOperationResult> {
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
  async getStats(): Promise<EIDRegistryStats> {
    const response = await fetch(`${this.apiEndpoint}/stats`);

    if (!response.ok) {
      throw new Error('Failed to fetch registry stats');
    }

    return response.json();
  }

  /**
   * Export EIDs to CSV
   */
  async exportToCSV(filters: EIDSearchFilters = {}): Promise<Blob> {
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
  private validateRegistrationRequest(request: EIDRegistrationRequest): void {
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
  static getEIDType(is_rad: boolean, is_experiment: boolean): EIDType {
    if (is_rad && is_experiment) {
      return EIDType.RAD_AND_EXPERIMENT;
    } else if (is_rad) {
      return EIDType.RAD_ONLY;
    } else if (is_experiment) {
      return EIDType.EXPERIMENT_ONLY;
    } else {
      throw new Error('Invalid EID classification');
    }
  }

  /**
   * Get human-readable type label
   */
  static getTypeLabel(type: EIDType): string {
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
  static getStatusColor(status: EIDStatus): string {
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
  static getHealthStatusColor(status: string): string {
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