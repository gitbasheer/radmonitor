# VH RAD Formula Builder MCP

A Model Context Protocol server for the VH RAD Traffic Monitor Formula Builder, enabling AI assistants to generate, validate, and explain formulas through natural language.

## Features

- **Natural Language Formula Generation** - Convert plain English queries to formula syntax
- **Formula Validation** - Check syntax and semantic correctness
- **Formula Explanation** - Get human-readable explanations of complex formulas
- **Query Conversion** - Transform formulas to Elasticsearch queries
- **Function Reference** - List available functions with examples

## Installation

```bash
cd mcp-formula-builder
npm install
```

## Usage with Cursor

### 1. Add to Cursor Settings

Open Cursor settings and add:

```json
{
  "mcpServers": {
    "vh-rad-formula": {
      "command": "node",
      "args": ["${workspaceFolder}/mcp-formula-builder/index.js"]
    }
  }
}
```

### 2. Available Commands

Once configured, you can ask Cursor:

- **"Generate a formula to detect traffic drops"**
  - Returns: `ifelse(count() < count(shift="1d") * 0.8, "ALERT", "OK")`

- **"Validate the formula: count() / count(shift='1d')"**
  - Returns validation results with any errors or warnings

- **"Explain what this formula does: sum(bytes) / count()"**
  - Returns: "This formula calculates the average bytes per event"

- **"Convert this formula to Elasticsearch query"**
  - Returns the corresponding Elasticsearch query structure

- **"List available formula functions"**
  - Returns all functions with syntax and examples

## Supported Patterns

The MCP recognizes these natural language patterns:

- **Traffic Monitoring**
  - "traffic drop" → Drop detection formula
  - "traffic drops by X%" → Percentage-based alerts
  - "baseline deviation" → Deviation from average

- **Error Detection**
  - "error rate" → Error percentage calculation
  - "errors exceed X%" → Error threshold alerts

- **Comparisons**
  - "week over week" → Time-based comparisons
  - "compare vs last week" → Historical comparisons

- **Health Metrics**
  - "health score" → System health calculation
  - "anomaly detection" → Statistical anomaly detection

- **Business Metrics**
  - "business impact" → Impact calculations
  - "recovery rate" → Recovery metrics

## API Reference

### Tools

#### `generateFormula`
```typescript
{
  query: string;        // Natural language query
  radType?: string;     // Optional RAD type for context
}
```

#### `validateFormula`
```typescript
{
  formula: string;      // Formula to validate
}
```

#### `explainFormula`
```typescript
{
  formula: string;      // Formula to explain
}
```

#### `convertToQuery`
```typescript
{
  formula: string;      // Formula to convert
  radType?: string;     // RAD type for filtering
  timeRange?: object;   // Time range for query
}
```

#### `listFunctions`
No parameters required.

## Examples

### Basic Usage

```javascript
// Generate a formula
const result = await generateFormula({
  query: "alert when traffic drops by 50%"
});
// Returns: ifelse(count() < count(shift="1d") * 0.5, "CRITICAL", "NORMAL")

// Validate a formula
const validation = await validateFormula({
  formula: "count() / count(shift='1d')"
});
// Returns: { valid: true, errors: [], warnings: [] }

// Explain a formula
const explanation = await explainFormula({
  formula: "sum(bytes) / count()"
});
// Returns detailed explanation with component breakdown
```

### Advanced Patterns

```javascript
// RAD-specific formula
const radFormula = await generateFormula({
  query: "monitor checkout_flow for drops",
  radType: "checkout_flow"
});

// Complex time comparisons
const comparison = await generateFormula({
  query: "compare this hour to same hour last week"
});

// Business metrics
const impact = await generateFormula({
  query: "calculate business impact of current issues"
});
```

## Testing

Run tests:
```bash
npm test
```

Test the MCP server directly:
```bash
# Start server
node index.js

# In another terminal, test tools/list
echo '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | node index.js
```

## Troubleshooting

### Server won't start
- Check Node.js version (requires 14+)
- Verify dependencies: `npm install`
- Check for port conflicts

### Formula generation issues
- Try rephrasing your query
- Check if the pattern is supported
- Use more specific terms

### Validation errors
- Check formula syntax
- Verify function names
- Ensure proper quoting for parameters

## Contributing

To add new patterns:

1. Edit pattern matching in `index.js`
2. Add test cases
3. Update this README
4. Submit PR with examples

## License

Part of the VH RAD Traffic Monitor project.
