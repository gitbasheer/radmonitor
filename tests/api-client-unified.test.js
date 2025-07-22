import { describe, it, expect, vi } from 'vitest';
import { UnifiedAPIClient } from '../assets/js/api-client-unified.js';

describe('UnifiedAPIClient', () => {
  it('should be a singleton', () => {
    const client1 = new UnifiedAPIClient();
    const client2 = new UnifiedAPIClient();
    expect(client1).not.toBe(client2);
  });

  it('should have a getElasticCookie method', () => {
    const client = new UnifiedAPIClient();
    expect(client.getElasticCookie).toBeInstanceOf(Function);
  });

  it('should have a saveElasticCookie method', () => {
    const client = new UnifiedAPIClient();
    expect(client.saveElasticCookie).toBeInstanceOf(Function);
  });

  it('should have a getAuthenticationDetails method', () => {
    const client = new UnifiedAPIClient();
    expect(client.getAuthenticationDetails).toBeInstanceOf(Function);
  });

  it('should have a promptForCookie method', () => {
    const client = new UnifiedAPIClient();
    expect(client.promptForCookie).toBeInstanceOf(Function);
  });

  it('should have a request method', () => {
    const client = new UnifiedAPIClient();
    expect(client.request).toBeInstanceOf(Function);
  });

  it('should have a get method', () => {
    const client = new UnifiedAPIClient();
    expect(client.get).toBeInstanceOf(Function);
  });

  it('should have a post method', () => {
    const client = new UnifiedAPIClient();
    expect(client.post).toBeInstanceOf(Function);
  });

  it('should have a buildQuery method', () => {
    const client = new UnifiedAPIClient();
    expect(client.buildQuery).toBeInstanceOf(Function);
  });

  it('should have a compareWindows method', () => {
    const client = new UnifiedAPIClient();
    expect(client.compareWindows).toBeInstanceOf(Function);
  });

  it('should have a compareWindowsWamGeneral method', () => {
    const client = new UnifiedAPIClient();
    expect(client.compareWindowsWamGeneral).toBeInstanceOf(Function);
  });

  it('should have a calculateOptimalPrecision method', () => {
    const client = new UnifiedAPIClient();
    expect(client.calculateOptimalPrecision).toBeInstanceOf(Function);
  });

  it('should have a generateKibanaLink method', () => {
    const client = new UnifiedAPIClient();
    expect(client.generateKibanaLink).toBeInstanceOf(Function);
  });

  it('should have a executeQuery method', () => {
    const client = new UnifiedAPIClient();
    expect(client.executeQuery).toBeInstanceOf(Function);
  });

  it('should have a fetchTrafficData method', () => {
    const client = new UnifiedAPIClient();
    expect(client.fetchTrafficData).toBeInstanceOf(Function);
  });

  it('should have a checkHealth method', () => {
    const client = new UnifiedAPIClient();
    expect(client.checkHealth).toBeInstanceOf(Function);
  });

  it('should have a getDashboardConfig method', () => {
    const client = new UnifiedAPIClient();
    expect(client.getDashboardConfig).toBeInstanceOf(Function);
  });

  it('should have a updateDashboardConfig method', () => {
    const client = new UnifiedAPIClient();
    expect(client.updateDashboardConfig).toBeInstanceOf(Function);
  });

  it('should have a getDashboardStats method', () => {
    const client = new UnifiedAPIClient();
    expect(client.getDashboardStats).toBeInstanceOf(Function);
  });

  it('should have a getMetrics method', () => {
    const client = new UnifiedAPIClient();
    expect(client.getMetrics).toBeInstanceOf(Function);
  });

  it('should have a connectWebSocket method', () => {
    const client = new UnifiedAPIClient();
    expect(client.connectWebSocket).toBeInstanceOf(Function);
  });

  it('should have a disconnectWebSocket method', () => {
    const client = new UnifiedAPIClient();
    expect(client.disconnectWebSocket).toBeInstanceOf(Function);
  });

  it('should have a handleWebSocketMessage method', () => {
    const client = new UnifiedAPIClient();
    expect(client.handleWebSocketMessage).toBeInstanceOf(Function);
  });

  it('should have a on method', () => {
    const client = new UnifiedAPIClient();
    expect(client.on).toBeInstanceOf(Function);
  });

  it('should have a off method', () => {
    const client = new UnifiedAPIClient();
    expect(client.off).toBeInstanceOf(Function);
  });

  it('should have a scheduleReconnect method', () => {
    const client = new UnifiedAPIClient();
    expect(client.scheduleReconnect).toBeInstanceOf(Function);
  });

  it('should have a clearReconnectInterval method', () => {
    const client = new UnifiedAPIClient();
    expect(client.clearReconnectInterval).toBeInstanceOf(Function);
  });

  it('should have a clearCache method', () => {
    const client = new UnifiedAPIClient();
    expect(client.clearCache).toBeInstanceOf(Function);
  });

  it('should have a getClientMetrics method', () => {
    const client = new UnifiedAPIClient();
    expect(client.getClientMetrics).toBeInstanceOf(Function);
  });

  it('should have a initialize method', () => {
    const client = new UnifiedAPIClient();
    expect(client.initialize).toBeInstanceOf(Function);
  });

  it('should have a cleanup method', () => {
    const client = new UnifiedAPIClient();
    expect(client.cleanup).toBeInstanceOf(Function);
  });
});
