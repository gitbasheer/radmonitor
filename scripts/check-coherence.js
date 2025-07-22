#!/usr/bin/env node

/**
 * System Coherence Checker
 * Identifies integration issues and inconsistencies
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const issues = [];

// Check 1: Multiple entry points
console.log('🔍 Checking entry points...');
const entryPoints = ['main.js', 'main-clean.js', 'main-simplified.js'];
const foundEntries = [];

entryPoints.forEach(file => {
    const filePath = path.join('assets/js', file);
    if (fs.existsSync(filePath)) {
        foundEntries.push(file);
    }
});

if (foundEntries.length > 1) {
    issues.push({
        severity: 'HIGH',
        category: 'Entry Points',
        issue: `Multiple entry points found: ${foundEntries.join(', ')}`,
        recommendation: 'Consolidate to single main.js'
    });
}

// Check 2: API Client usage
console.log('🔍 Checking API client usage...');
const apiClients = [
    'api-client-unified.js',
    'api-client-simplified.js',
    'api-client-fastapi.js',
    'api-interface.js'
];

const jsFiles = [];
function findJSFiles(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules' && file !== 'venv') {
            findJSFiles(fullPath);
        } else if (file.endsWith('.js')) {
            jsFiles.push(fullPath);
        }
    });
}

findJSFiles('assets/js');

const clientUsage = {};
apiClients.forEach(client => {
    clientUsage[client] = [];
});

jsFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    apiClients.forEach(client => {
        if (content.includes(`from './${client}'`) || content.includes(`from "./${client}"`)) {
            clientUsage[client].push(path.relative('.', file));
        }
    });
});

// Check if multiple API clients are used
const usedClients = Object.entries(clientUsage).filter(([_, files]) => files.length > 0);
if (usedClients.length > 2) { // api-interface.js + one implementation is OK
    issues.push({
        severity: 'HIGH',
        category: 'API Clients',
        issue: 'Multiple API clients in use',
        details: usedClients.map(([client, files]) =>
            `${client}: used by ${files.length} files`
        ).join('\n'),
        recommendation: 'Standardize on api-interface.js'
    });
}

// Check 3: Dashboard implementations
console.log('🔍 Checking dashboard implementations...');
const dashboards = ['dashboard-main.js', 'dashboard-simplified.js'];
const foundDashboards = [];

dashboards.forEach(file => {
    const filePath = path.join('assets/js', file);
    if (fs.existsSync(filePath)) {
        foundDashboards.push(file);
    }
});

if (foundDashboards.length > 1) {
    issues.push({
        severity: 'MEDIUM',
        category: 'Dashboard',
        issue: `Multiple dashboard implementations: ${foundDashboards.join(', ')}`,
        recommendation: 'Consolidate to single dashboard implementation'
    });
}

// Check 4: Authentication consistency
console.log('🔍 Checking authentication flow...');
const authPatterns = [
    { pattern: /localStorage\.getItem\(['"]elasticCookie/, name: 'Direct localStorage access' },
    { pattern: /window\.ELASTIC_COOKIE/, name: 'window.ELASTIC_COOKIE usage' },
    { pattern: /getElasticCookie/, name: 'getElasticCookie method' },
    { pattern: /X-Elastic-Cookie/, name: 'X-Elastic-Cookie header' }
];

const authUsage = {};
authPatterns.forEach(({ name }) => {
    authUsage[name] = [];
});

jsFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    authPatterns.forEach(({ pattern, name }) => {
        if (pattern.test(content)) {
            authUsage[name].push(path.relative('.', file));
        }
    });
});

const authMethods = Object.entries(authUsage).filter(([_, files]) => files.length > 0);
if (authMethods.length > 2) {
    issues.push({
        severity: 'HIGH',
        category: 'Authentication',
        issue: 'Multiple authentication methods in use',
        details: authMethods.map(([method, files]) =>
            `${method}: ${files.length} files`
        ).join('\n'),
        recommendation: 'Centralize all auth through auth-service.js'
    });
}

// Check 5: Configuration endpoints
console.log('🔍 Checking endpoint consistency...');
const endpointFile = 'config/api-endpoints.json';
if (fs.existsSync(endpointFile)) {
    const endpoints = JSON.parse(fs.readFileSync(endpointFile, 'utf8'));

    // Check if endpoints match what backend expects
    if (!endpoints.dashboard || !endpoints.dashboard.query) {
        issues.push({
            severity: 'MEDIUM',
            category: 'Configuration',
            issue: 'api-endpoints.json missing dashboard.query endpoint',
            recommendation: 'Update to match backend endpoints'
        });
    }
}

// Generate report
console.log('\n COHERENCE CHECK REPORT\n');
console.log('=' .repeat(60));

if (issues.length === 0) {
    console.log('(✓)No coherence issues found!');
} else {
    const highIssues = issues.filter(i => i.severity === 'HIGH');
    const mediumIssues = issues.filter(i => i.severity === 'MEDIUM');
    const lowIssues = issues.filter(i => i.severity === 'LOW');

    console.log(`Found ${issues.length} issues:\n`);
    console.log(`🔴 HIGH: ${highIssues.length}`);
    console.log(`🟡 MEDIUM: ${mediumIssues.length}`);
    console.log(`🟢 LOW: ${lowIssues.length}\n`);

    console.log('=' .repeat(60));

    issues.sort((a, b) => {
        const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
    }).forEach(issue => {
        const icon = issue.severity === 'HIGH' ? '🔴' :
                     issue.severity === 'MEDIUM' ? '🟡' : '🟢';

        console.log(`\n${icon} ${issue.severity} - ${issue.category}`);
        console.log(`Issue: ${issue.issue}`);
        if (issue.details) {
            console.log(`Details:\n${issue.details}`);
        }
        console.log(`Recommendation: ${issue.recommendation}`);
    });
}

console.log('\n' + '=' .repeat(60));
console.log('\n💡 See COHERENCE_FIX_PLAN.md for detailed fix instructions\n');
