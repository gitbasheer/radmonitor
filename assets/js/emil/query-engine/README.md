# ES|QL Query Engine

A robust and maintainable query engine for building and executing ES|QL queries for EID monitoring.

## Architecture

The query engine is organized into several modules:

### Core Modules

- **query-builder.ts** - Main query builder that transforms intents and templates into ES|QL queries
- **query-executor.ts** - Handles query execution with caching, retries, and error handling  
- **query-config.ts** - Centralized configuration for defaults, thresholds, and limits
- **validation.ts** - Type-safe parameter validation utilities
- **errors.ts** - Custom error classes for better error handling

### Template System

- **esql/query-templates.ts** - Predefined query templates for common monitoring scenarios
- **esql/template-types.ts** - TypeScript interfaces for query templates and results

## Usage

### Building Queries from Intents

```typescript
import { ESQLQueryBuilder } from './query-engine';

const intent = {
  action: 'health-check',
  eids: ['eid-123', 'eid-456'],
  parameters: {
    time_window: '2h',
    critical_error_threshold: 0.15
  }
};

const query = ESQLQueryBuilder.buildFromIntent(intent);
```

### Building Queries from Templates

```typescript
const query = ESQLQueryBuilder.buildFromTemplate('healthCheck', {
  eids: ['eid-123'],
  time_window: '1h'
});
```

### Executing Queries

```typescript
import { QueryExecutor } from './query-engine';

const result = await QueryExecutor.execute(query, {
  enableCache: true,
  cacheTTL: 300,
  timeout: 30000,
  retryAttempts: 2
});
```

## Available Templates

1. **healthCheck** - Check current health status of EIDs
2. **baselineComparison** - Compare current traffic against historical baseline
3. **trendAnalysis** - Analyze traffic trends over time buckets
4. **performanceMetrics** - Detailed performance metrics for EIDs
5. **abTestComparison** - Compare performance between experiment variants

## Error Handling

The query engine uses custom error classes for better debugging:

- `TemplateNotFoundError` - Template ID not found
- `MissingParameterError` - Required parameter is missing
- `ParameterValidationError` - Parameter validation failed
- `QueryBuildError` - Query building failed
- `QuerySyntaxError` - Generated query has syntax errors
- `QueryExecutionError` - Query execution failed

Example error handling:

```typescript
import { QueryErrorFactory } from './query-engine';

try {
  const query = ESQLQueryBuilder.buildFromIntent(intent);
} catch (error) {
  const userMessage = QueryErrorFactory.getUserMessage(error);
  console.error(userMessage);
}
```

## Configuration

Key configuration options in `query-config.ts`:

- Default parameter values
- Health and performance thresholds
- Validation patterns and limits
- Cache settings
- Error message templates

## Validation

The validation module provides:

- Type-safe parameter validation
- EID list validation with limits
- Time range validation
- Interval parsing utilities
- Value formatting for ES|QL

## Caching

Query results are cached to improve performance:

- Configurable TTL per query
- Automatic cache cleanup
- Cache statistics available
- Manual cache clearing

## Development

### Adding New Templates

1. Add template definition to `esql/query-templates.ts`
2. Add result type interface to `esql/template-types.ts`
3. Update `IntentTemplateMap` in `query-config.ts` if needed

### Testing

Run tests with:
```bash
npm test -- query-engine
```

## Best Practices

1. Always validate user inputs before building queries
2. Use appropriate cache TTLs based on data freshness requirements
3. Handle errors gracefully with user-friendly messages
4. Monitor query performance and adjust timeouts as needed
5. Keep templates focused and reusable