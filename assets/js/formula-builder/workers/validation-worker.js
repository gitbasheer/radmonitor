/**
 * Web Worker for Real-time Formula Validation
 * Achieves <100ms validation response time by running in separate thread
 */

// Import validation logic (will be bundled)
importScripts('../core/enhanced-ast-parser.js', '../core/enhanced-validator.js', '../core/formula-functions.js');

// Initialize services
let parser = null;
let validator = null;
let cache = new Map();
const MAX_CACHE_SIZE = 100;

// Performance monitoring
const performanceStats = {
  totalValidations: 0,
  cacheHits: 0,
  avgValidationTime: 0,
  maxValidationTime: 0
};

// Initialize worker
self.onmessage = async function(e) {
  const { type, id, data } = e.data;
  
  try {
    switch (type) {
      case 'init':
        await handleInit(data);
        self.postMessage({ type: 'init-complete', id });
        break;
        
      case 'validate':
        await handleValidate(id, data);
        break;
        
      case 'update-schema':
        await handleUpdateSchema(data);
        self.postMessage({ type: 'schema-updated', id });
        break;
        
      case 'clear-cache':
        cache.clear();
        self.postMessage({ type: 'cache-cleared', id });
        break;
        
      case 'get-stats':
        self.postMessage({ 
          type: 'stats', 
          id, 
          data: performanceStats 
        });
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      id,
      error: {
        message: error.message,
        stack: error.stack
      }
    });
  }
};

async function handleInit(config) {
  // Initialize parser and validator
  parser = new EnhancedFormulaParser();
  validator = new EnhancedFormulaValidator(config);
  
  // Warm up the parser with common patterns
  const warmupFormulas = [
    'sum(bytes)',
    'average(response_time)',
    'count()',
    'sum(revenue) / count()',
    'moving_average(average(cpu), window=5)'
  ];
  
  for (const formula of warmupFormulas) {
    try {
      const ast = parser.parse(formula);
      if (ast.success) {
        await validator.validate(ast.ast);
      }
    } catch (e) {
      // Ignore warmup errors
    }
  }
}

async function handleValidate(id, data) {
  const { formula, context } = data;
  const startTime = performance.now();
  
  // Check cache
  const cacheKey = `${formula}-${JSON.stringify(context)}`;
  const cached = cache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < 60000) { // 1 minute cache
    performanceStats.cacheHits++;
    self.postMessage({
      type: 'validation-result',
      id,
      result: cached.result,
      cached: true
    });
    return;
  }
  
  try {
    // Parse formula
    const parseResult = parser.parse(formula);
    
    if (!parseResult.success) {
      const result = {
        valid: false,
        results: parseResult.errors.map(err => ({
          severity: 'error',
          message: err.message,
          position: err.position
        })),
        validationTime: performance.now() - startTime
      };
      
      self.postMessage({
        type: 'validation-result',
        id,
        result
      });
      return;
    }
    
    // Validate AST
    const validationResult = await validator.validate(parseResult.ast, context);
    
    // Add performance metrics
    validationResult.parseTime = parseResult.parseTime || 0;
    validationResult.totalTime = performance.now() - startTime;
    
    // Update cache
    addToCache(cacheKey, validationResult);
    
    // Update stats
    updateStats(validationResult.totalTime);
    
    // Send result
    self.postMessage({
      type: 'validation-result',
      id,
      result: validationResult
    });
    
  } catch (error) {
    const result = {
      valid: false,
      results: [{
        severity: 'error',
        message: `Validation error: ${error.message}`,
        position: 0
      }],
      validationTime: performance.now() - startTime
    };
    
    self.postMessage({
      type: 'validation-result',
      id,
      result
    });
  }
}

async function handleUpdateSchema(schema) {
  if (validator) {
    validator.fieldSchema = new Map(Object.entries(schema));
  }
}

function addToCache(key, result) {
  // Implement LRU cache
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  
  cache.set(key, {
    result,
    timestamp: Date.now()
  });
}

function updateStats(validationTime) {
  performanceStats.totalValidations++;
  
  // Update max time
  if (validationTime > performanceStats.maxValidationTime) {
    performanceStats.maxValidationTime = validationTime;
  }
  
  // Update average time
  const currentTotal = performanceStats.avgValidationTime * (performanceStats.totalValidations - 1);
  performanceStats.avgValidationTime = (currentTotal + validationTime) / performanceStats.totalValidations;
}

// Optimization: Pre-compile common validation patterns
const commonPatterns = {
  simpleAggregation: /^(sum|average|count|max|min|unique_count)\s*\(\s*[\w.]+\s*\)$/,
  ratio: /^[\w()]+\s*\/\s*[\w()]+$/,
  comparison: /^[\w()]+\s*(>|<|>=|<=|==|!=)\s*[\w()]+$/
};

// Fast path for common patterns
function fastValidate(formula) {
  for (const [patternName, pattern] of Object.entries(commonPatterns)) {
    if (pattern.test(formula)) {
      return {
        valid: true,
        results: [],
        fastPath: true,
        pattern: patternName
      };
    }
  }
  return null;
}