#!/usr/bin/env node

// Goldclaw MCP Server Entry Point
// Compiled TypeScript runs here

require('tsx/cjs').register();
require('./src/mcp/server.ts');
