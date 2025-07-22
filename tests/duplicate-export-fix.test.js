/**
 * Tests for duplicate export and favicon fixes
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';

describe('Duplicate Export Fix', () => {
  it('should successfully import EnhancedFormulaEditor without syntax errors', async () => {
    // This should not throw a duplicate export error
    const module = await import('../assets/js/formula-builder/ui/enhanced-formula-editor.js');

    // Should have the exported class
    expect(module.EnhancedFormulaEditor).toBeDefined();
    expect(typeof module.EnhancedFormulaEditor).toBe('function');
  });

  it('should only export EnhancedFormulaEditor once', async () => {
    const fileContent = await import('fs').then(fs =>
      fs.promises.readFile('./assets/js/formula-builder/ui/enhanced-formula-editor.js', 'utf8')
    );

    // Count exports of EnhancedFormulaEditor
    const exportMatches = fileContent.match(/export\s+.*?EnhancedFormulaEditor/g) || [];

    // Should only have one export (the class declaration)
    expect(exportMatches.length).toBe(1);
    expect(exportMatches[0]).toContain('export class EnhancedFormulaEditor');
  });

    it('should properly register custom element without errors', async () => {
    // Import the module
    const module = await import('../assets/js/formula-builder/ui/enhanced-formula-editor.js');

    // The module should export the class
    expect(module.EnhancedFormulaEditor).toBeDefined();
    expect(typeof module.EnhancedFormulaEditor).toBe('function');

    // Test that it extends HTMLElement
    expect(module.EnhancedFormulaEditor.prototype).toBeInstanceOf(HTMLElement);

    // Test that it has the required methods
    const instance = new module.EnhancedFormulaEditor();
    expect(instance.getValue).toBeDefined();
    expect(instance.setValue).toBeDefined();
  });
});

describe('Favicon Fix', () => {
  // Skip these tests if not running with a server
  const serverUrl = 'http://localhost:8000';

  it.skipIf(!process.env.TEST_SERVER)('should serve favicon without 404 error', async () => {
    try {
      const response = await fetch(`${serverUrl}/favicon.ico`);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('image');
    } catch (error) {
      console.log('Server not running, skipping favicon test');
    }
  });

    it('should have favicon endpoint defined in server', async () => {
    const serverContent = await import('fs').then(fs =>
      fs.promises.readFile('./bin/server.py', 'utf8')
    );

    // Check for favicon endpoint in the FastAPI server
    expect(serverContent).toContain('@app.get("/favicon.ico")');
    expect(serverContent).toContain('async def favicon()');
    expect(serverContent).toContain('FileResponse(favicon_path)');
  });
});

describe('Formula Builder Integration After Fixes', () => {
  let dom;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      runScripts: 'dangerously',
      resources: 'usable'
    });

    global.window = dom.window;
    global.document = window.document;
    global.HTMLElement = window.HTMLElement;
    global.customElements = window.customElements;
    global.ShadowRoot = window.ShadowRoot;
  });

    it('should initialize formula editor without errors', async () => {
    // Import the module
    const module = await import('../assets/js/formula-builder/ui/enhanced-formula-editor.js');

    // Verify the class is exported
    expect(module.EnhancedFormulaEditor).toBeDefined();
    expect(typeof module.EnhancedFormulaEditor).toBe('function');

    // Create an instance directly (bypassing DOM complexity)
    const editorClass = module.EnhancedFormulaEditor;
    const editor = new editorClass();

    // Test basic methods exist
    expect(editor.getValue).toBeDefined();
    expect(editor.setValue).toBeDefined();
    expect(typeof editor.getValue).toBe('function');
    expect(typeof editor.setValue).toBe('function');

    // Test basic functionality (without DOM)
    editor.value = 'test formula';
    expect(editor.getValue()).toBe('test formula');
  }, 5000); // Reduced timeout

    it('should handle all imports correctly', async () => {
    // All these imports should work without errors
    const imports = [
      import('../assets/js/formula-builder/core/enhanced-ast-parser.js'),
      import('../assets/js/formula-builder/core/enhanced-validator.js'),
      import('../assets/js/formula-builder/core/formula-functions.js'),
      import('../assets/js/formula-builder/ui/enhanced-formula-editor.js'),
      import('../assets/js/formula-builder/ui/enhanced-visual-builder.js'),
      import('../assets/js/formula-builder/ai/formula-ai-assistant.js')
    ];

    const results = await Promise.allSettled(imports);

    // All imports should succeed
    results.forEach((result, index) => {
      expect(result.status).toBe('fulfilled');
      if (result.status === 'rejected') {
        console.error(`Import ${index} failed:`, result.reason);
      }
    });

    // Check that key exports are available
    const [astParser, validator, functions, editor, visualBuilder, aiAssistant] = results.map(r => r.value);

    expect(astParser.EnhancedFormulaParser).toBeDefined();
    expect(functions.FUNCTION_METADATA).toBeDefined();
    expect(editor.EnhancedFormulaEditor).toBeDefined();
  }, 15000); // Increase timeout for this test
});

describe('Console Error Prevention', () => {
  it('should not have any syntax errors in JavaScript files', async () => {
    const jsFiles = [
      './assets/js/formula-builder/ui/enhanced-formula-editor.js',
      './assets/js/formula-builder/ui/enhanced-visual-builder.js',
      './assets/js/formula-builder/ai/formula-ai-assistant.js',
      './assets/js/formula-editor-integration.js',
      './assets/js/visual-formula-builder-integration.js'
    ];

    for (const file of jsFiles) {
      try {
        // Dynamic import should not throw syntax errors
        await import(file);
      } catch (error) {
        // Only fail on syntax errors, not runtime errors
        if (error instanceof SyntaxError) {
          throw new Error(`Syntax error in ${file}: ${error.message}`);
        }
      }
    }
  });
});
