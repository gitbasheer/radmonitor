/**
 * EID Parser - Parse GoDaddy RAD EID naming conventions
 * Format: namespace.radset.radId.subaction.action
 */

import { EIDMetadata } from '../types/index.js';

export class EIDParser {
  private static readonly DEFAULT_NAMESPACE = 'pandc';
  private static readonly DEFAULT_RADSET = 'vnext';

  /**
   * Parse an EID string into its components
   */
  static parse(eid: string): Partial<EIDMetadata> {
    if (!eid || typeof eid !== 'string') {
      throw new Error('Invalid EID: must be a non-empty string');
    }

    const parts = eid.split('.');

    // Handle different EID formats
    if (parts.length < 3) {
      throw new Error(`Invalid EID format: ${eid}. Expected at least namespace.radset.radId`);
    }

    const result: Partial<EIDMetadata> = {
      eid,
      namespace: parts[0],
      radset: parts[1],
      radId: parts[2]
    };

    // Optional parts
    if (parts.length > 3) {
      result.subaction = parts[3];
    }

    if (parts.length > 4) {
      result.action = parts.slice(4).join('.'); // Handle nested actions
    }

    return result;
  }

  /**
   * Validate an EID format
   */
  static validate(eid: string): boolean {
    try {
      const parsed = this.parse(eid);
      return !!(parsed.namespace && parsed.radset && parsed.radId);
    } catch {
      return false;
    }
  }

  /**
   * Build an EID from components
   */
  static build(components: {
    namespace?: string;
    radset?: string;
    radId: string;
    subaction?: string;
    action?: string;
  }): string {
    const parts = [
      components.namespace || this.DEFAULT_NAMESPACE,
      components.radset || this.DEFAULT_RADSET,
      components.radId
    ];

    if (components.subaction) {
      parts.push(components.subaction);
    }

    if (components.action) {
      parts.push(components.action);
    }

    return parts.join('.');
  }

  /**
   * Extract RAD type from EID
   * Common patterns: recommendations, discovery, search, etc.
   */
  static extractRADType(eid: string): string {
    try {
      const parsed = this.parse(eid);
      const radId = parsed.radId || '';

      // Common RAD types based on existing patterns
      if (radId.includes('recommendation')) return 'recommendations';
      if (radId.includes('discovery')) return 'discovery';
      if (radId.includes('search')) return 'search';
      if (radId.includes('feed')) return 'feed';
      if (radId.includes('cart')) return 'cart';
      if (radId.includes('checkout')) return 'checkout';

      // Default to the radId itself
      return radId;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Extract RAD identifier for filtering purposes
   * For Venture Feed RADs: pandc.vnext.recommendations.feed.feed*
   * Returns a string that can be used to group EIDs by RAD
   */
  static extractRADIdentifier(eid: string): string {
    try {
      const parsed = this.parse(eid);

      // For venture feed RADs, group by the pattern
      if (parsed.namespace === 'pandc' &&
          parsed.radset === 'vnext' &&
          parsed.radId === 'recommendations' &&
          parsed.subaction?.startsWith('feed.feed')) {
        return 'venture-feed';
      }

      // For other RADs, use namespace.radset.radId as the identifier
      return `${parsed.namespace}.${parsed.radset}.${parsed.radId}`;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Get human-readable RAD name from identifier
   */
  static getRADDisplayName(radIdentifier: string): string {
    const radNames: Record<string, string> = {
      'venture-feed': 'Venture Feed',
      'pandc.vnext.recommendations': 'Recommendations',
      'pandc.vnext.metricsevolved': 'Metrics Evolved',
      'pandc.vnext.cart': 'Cart Recommendations',
      'pandc.vnext.product': 'Product Recommendations',
      'pandc.vnext.discovery': 'Discovery',
      'pandc.vnext.search': 'Search'
    };

    return radNames[radIdentifier] || this.humanize(radIdentifier.split('.').pop() || radIdentifier);
  }

  /**
   * Get display name for an EID
   */
  static getDisplayName(eid: string): string {
    try {
      const parsed = this.parse(eid);
      const parts = [];

      // Build human-readable name
      if (parsed.radId) {
        parts.push(this.humanize(parsed.radId));
      }

      if (parsed.subaction) {
        parts.push(this.humanize(parsed.subaction));
      }

      if (parsed.action) {
        parts.push(this.humanize(parsed.action));
      }

      return parts.join(' - ');
    } catch {
      return eid; // Return original if parsing fails
    }
  }

  /**
   * Convert camelCase or snake_case to human readable
   */
  private static humanize(str: string): string {
    return str
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/_/g, ' ') // Replace underscores with spaces
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()
      .toLowerCase()
      .replace(/^\w/, c => c.toUpperCase()); // Capitalize first letter
  }

  /**
   * Get hierarchy path for an EID
   */
  static getHierarchyPath(eid: string): string[] {
    try {
      const parsed = this.parse(eid);
      const path = [];

      if (parsed.namespace) path.push(parsed.namespace);
      if (parsed.radset) path.push(parsed.radset);
      if (parsed.radId) path.push(parsed.radId);
      if (parsed.subaction) path.push(parsed.subaction);
      if (parsed.action) path.push(parsed.action);

      return path;
    } catch {
      return [eid];
    }
  }

  /**
   * Check if two EIDs belong to the same RAD
   */
  static isSameRAD(eid1: string, eid2: string): boolean {
    try {
      const parsed1 = this.parse(eid1);
      const parsed2 = this.parse(eid2);

      return parsed1.namespace === parsed2.namespace &&
             parsed1.radset === parsed2.radset &&
             parsed1.radId === parsed2.radId;
    } catch {
      return false;
    }
  }

  /**
   * Check if two EIDs belong to the same RADSet
   */
  static isSameRADSet(eid1: string, eid2: string): boolean {
    try {
      const parsed1 = this.parse(eid1);
      const parsed2 = this.parse(eid2);

      return parsed1.namespace === parsed2.namespace &&
             parsed1.radset === parsed2.radset;
    } catch {
      return false;
    }
  }

  /**
   * Create metadata from EID with defaults
   */
  static createMetadata(eid: string, additionalData?: Partial<EIDMetadata>): EIDMetadata {
    const parsed = this.parse(eid);

    return {
      eid,
      namespace: parsed.namespace || this.DEFAULT_NAMESPACE,
      radset: parsed.radset || this.DEFAULT_RADSET,
      radId: parsed.radId || 'unknown',
      subaction: parsed.subaction,
      action: parsed.action,
      lastSeen: new Date(),
      frequency: 0,
      ...additionalData
    };
  }
}
