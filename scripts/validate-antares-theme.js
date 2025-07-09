#!/usr/bin/env node

/**
 * Validation script for Antares Design System implementation
 * Checks CSS files, JavaScript files, and HTML for proper theme usage
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    gray: '\x1b[90m'
};

// Validation rules
const VALIDATIONS = {
    css: {
        requiredTokens: [
            '--gd-color-orange-primary',
            '--gd-color-background',
            '--gd-color-surface',
            '--gd-color-text-primary',
            '--gd-spacing-xs',
            '--gd-font-family-base',
            '--gd-heading-4xl'
        ],
        prohibitedPatterns: [
            { pattern: /#ff6900(?![0-9a-fA-F])/g, message: 'Hardcoded orange color #ff6900 found' },
            { pattern: /height:\s*48px.*button/gi, message: 'Button height should be 52px, not 48px' },
            { pattern: /font-size:\s*\d+px(?!.*var)/g, message: 'Font sizes should use design tokens' }
        ],
        requiredClasses: [
            '.gd-button',
            '.gd-button-primary',
            '.gd-input',
            '.gd-card',
            '.gd-badge'
        ]
    },
    javascript: {
        requiredClasses: [
            'gd-button',
            'gd-modal',
            'gd-input'
        ],
        patterns: {
            oldClasses: [
                { pattern: /className\s*=\s*['"`]control-button['"`](?!\s|gd)/g, message: 'control-button without gd-button' },
                { pattern: /classList\.add\(['"`]badge['"`]\)(?!.*gd-badge)/g, message: 'badge without gd-badge' }
            ]
        }
    },
    html: {
        requiredImports: [
            'assets/css/antares-theme.css',
            'assets/css/dashboard-antares.css'
        ],
        requiredAttributes: [
            { selector: 'button', attribute: 'class', shouldContain: 'gd-button' },
            { selector: 'input[type="text"]', attribute: 'class', shouldContain: 'gd-input' }
        ]
    }
};

// Files to check
const FILES_TO_CHECK = {
    css: [
        'assets/css/dashboard-antares.css',
        'assets/css/formula-builder-antares.css',
        'assets/css/antares-theme.css'
    ],
    js: [
        'assets/js/ui-updater.js',
        'assets/js/dashboard-main.js',
        'assets/js/visual-formula-builder-integration.js',
        'assets/js/config-editor.js'
    ],
    html: [
        'index.html',
        'formula-builder-demo.html',
        'test-antares-theme.html'
    ]
};

let totalIssues = 0;
let totalWarnings = 0;
let totalPassed = 0;

function log(type, message) {
    switch(type) {
        case 'success':
            console.log(`${colors.green}✓${colors.reset} ${message}`);
            totalPassed++;
            break;
        case 'error':
            console.log(`${colors.red}✗${colors.reset} ${message}`);
            totalIssues++;
            break;
        case 'warning':
            console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
            totalWarnings++;
            break;
        case 'info':
            console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
            break;
        case 'section':
            console.log(`\n${colors.blue}▶ ${message}${colors.reset}`);
            break;
    }
}

function validateCSSFile(filePath) {
    if (!fs.existsSync(filePath)) {
        log('warning', `File not found: ${filePath}`);
        return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);

    log('info', `Checking ${fileName}`);

    // Check for required tokens
    VALIDATIONS.css.requiredTokens.forEach(token => {
        if (!content.includes(token)) {
            log('error', `Missing required token: ${token} in ${fileName}`);
        }
    });

    // Check for prohibited patterns
    VALIDATIONS.css.prohibitedPatterns.forEach(({ pattern, message }) => {
        const matches = content.match(pattern);
        if (matches) {
            log('warning', `${message} in ${fileName} (${matches.length} occurrences)`);
        }
    });

    // Check for required classes
    VALIDATIONS.css.requiredClasses.forEach(className => {
        if (!content.includes(className)) {
            log('warning', `Missing required class: ${className} in ${fileName}`);
        }
    });

    // Check button height
    const buttonHeightPattern = /\.gd-button[^{]*{[^}]*height:\s*(\d+)px/g;
    let match;
    while ((match = buttonHeightPattern.exec(content)) !== null) {
        if (match[1] !== '52') {
            log('error', `Button height should be 52px, found ${match[1]}px in ${fileName}`);
        } else {
            log('success', `Button height correctly set to 52px in ${fileName}`);
        }
    }

    // Check spacing usage
    const spacingPattern = /padding:\s*(\d+)px|margin:\s*(\d+)px/g;
    const validSpacing = [0, 4, 8, 12, 16, 24, 32, 48];
    while ((match = spacingPattern.exec(content)) !== null) {
        const value = parseInt(match[1] || match[2]);
        if (!validSpacing.includes(value) && value < 50) {
            log('warning', `Non-standard spacing value: ${value}px in ${fileName}. Consider using 8px grid.`);
        }
    }
}

function validateJSFile(filePath) {
    if (!fs.existsSync(filePath)) {
        log('warning', `File not found: ${filePath}`);
        return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);

    log('info', `Checking ${fileName}`);

    // Check for Antares classes
    let hasAntaresClasses = false;
    VALIDATIONS.javascript.requiredClasses.forEach(className => {
        if (content.includes(className)) {
            hasAntaresClasses = true;
        }
    });

    if (!hasAntaresClasses && content.includes('className')) {
        log('warning', `No Antares classes found in ${fileName} but className is used`);
    }

    // Check for old patterns without new ones
    VALIDATIONS.javascript.patterns.oldClasses.forEach(({ pattern, message }) => {
        const matches = content.match(pattern);
        if (matches) {
            log('error', `${message} in ${fileName}`);
        }
    });

    // Check for proper class combinations
    if (content.includes('control-button') && content.includes('gd-button')) {
        log('success', `Properly using both legacy and Antares classes in ${fileName}`);
    }
}

function validateHTMLFile(filePath) {
    if (!fs.existsSync(filePath)) {
        log('warning', `File not found: ${filePath}`);
        return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);

    log('info', `Checking ${fileName}`);

    // Check for required CSS imports
    VALIDATIONS.html.requiredImports.forEach(importPath => {
        if (content.includes(importPath)) {
            log('success', `Found required import: ${importPath} in ${fileName}`);
        } else if (fileName !== 'test-antares-theme.html') {
            log('error', `Missing required import: ${importPath} in ${fileName}`);
        }
    });

    // Check for viewport meta tag
    if (!content.includes('viewport')) {
        log('warning', `Missing viewport meta tag in ${fileName}`);
    }

    // Check for dark theme support
    if (content.includes('antares-theme.css') && !content.includes('dark-theme')) {
        log('info', `Consider adding dark theme toggle functionality in ${fileName}`);
    }
}

// Main execution
console.log(`${colors.blue}🎨 Validating Antares Design System Implementation${colors.reset}\n`);

// Validate CSS files
log('section', 'Validating CSS Files');
FILES_TO_CHECK.css.forEach(validateCSSFile);

// Validate JavaScript files
log('section', 'Validating JavaScript Files');
FILES_TO_CHECK.js.forEach(validateJSFile);

// Validate HTML files
log('section', 'Validating HTML Files');
FILES_TO_CHECK.html.forEach(validateHTMLFile);

// Summary
console.log(`\n${colors.blue}📊 Validation Summary${colors.reset}`);
console.log(`${colors.green}Passed: ${totalPassed}${colors.reset}`);
console.log(`${colors.yellow}Warnings: ${totalWarnings}${colors.reset}`);
console.log(`${colors.red}Issues: ${totalIssues}${colors.reset}`);

if (totalIssues === 0) {
    console.log(`\n${colors.green}✨ All critical validations passed!${colors.reset}`);
    process.exit(0);
} else {
    console.log(`\n${colors.red}(✗) Found ${totalIssues} issues that need attention.${colors.reset}`);
    process.exit(1);
}
