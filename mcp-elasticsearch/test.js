#!/usr/bin/env node

// Simple test for Elasticsearch MCP
// Run with: node test.js

console.log('Testing Elasticsearch MCP...\n');

// Test tool list request
const toolListRequest = {
  jsonrpc: '2.0',
  method: 'tools/list',
  id: 1
};

console.log('Sending tools/list request:');
console.log(JSON.stringify(toolListRequest));
console.log('\nExpected: List of available tools\n');

// Test monitor traffic request
const monitorRequest = {
  jsonrpc: '2.0',
  method: 'tools/call',
  params: {
    name: 'monitorRADTraffic',
    arguments: {
      compareWith: '1d',
      threshold: 0.8
    }
  },
  id: 2
};

console.log('\nExample monitorRADTraffic request:');
console.log(JSON.stringify(monitorRequest, null, 2));
console.log('\nExpected: Traffic monitoring results with status\n');

// Test query execution
const queryRequest = {
  jsonrpc: '2.0',
  method: 'tools/call',
  params: {
    name: 'executeQuery',
    arguments: {
      query: 'event_id:*feed*',
      timeRange: {
        from: 'now-1h',
        to: 'now'
      },
      size: 5
    }
  },
  id: 3
};

console.log('\nExample executeQuery request:');
console.log(JSON.stringify(queryRequest, null, 2));
console.log('\nExpected: Query results with hits\n');

console.log('To test the MCP server:');
console.log('1. In one terminal: node index.js');
console.log('2. In another terminal, send these requests via stdin');
console.log('3. Or configure in Cursor and use natural language\n');
