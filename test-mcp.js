#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Create the MCP server
const server = new Server(
  {
    name: 'test-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools/list handler
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'testTool',
        description: 'A simple test tool',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Test message'
            }
          }
        }
      }
    ]
  };
});

// Register tools/call handler
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'testTool') {
    return {
      content: [{
        type: 'text',
        text: `Test response: ${args?.message || 'No message'}`
      }]
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Test MCP running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
