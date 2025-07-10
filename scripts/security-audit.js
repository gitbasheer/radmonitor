#!/usr/bin/env node

/**
 * Security Audit Script for RAD Monitor
 * Checks for sensitive data logging, XSS vulnerabilities, and other security issues
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SENSITIVE_PATTERNS = [
    /console\.log.*cookie/i,
    /console\.log.*token/i,
    /console\.log.*password/i,
    /console\.log.*secret/i,
    /console\.log.*key/i,
    /console\.log.*auth/i,
    /console\.log.*credential/i,
    /console\.warn.*cookie/i,
    /console\.warn.*token/i,
    /console\.warn.*password/i,
    /console\.warn.*secret/i,
    /console\.warn.*key/i,
    /console\.warn.*auth/i,
    /console\.warn.*credential/i,
    /console\.error.*cookie/i,
    /console\.error.*token/i,
    /console\.error.*password/i,
    /console\.error.*secret/i,
    /console\.error.*key/i,
    /console\.error.*auth/i,
    /console\.error.*credential/i,
    /innerHTML\s*=/i,
    /eval\s*\(/i,
    /Function\s*\(/i,
    /setTimeout\s*\(/i,
    /setInterval\s*\(/i,
    /import\s*\(/i,
    /require\s*\(/i,
    /localStorage\.setItem.*cookie/i,
    /localStorage\.setItem.*token/i,
    /localStorage\.setItem.*password/i,
    /localStorage\.setItem.*secret/i,
    /localStorage\.setItem.*key/i,
    /localStorage\.setItem.*auth/i,
    /localStorage\.setItem.*credential/i
];

const FORBIDDEN_PATTERNS = [
    /api_key\s*[:=]\s*['"`][^'"`]+['"`]/i,
    /secret_key\s*[:=]\s*['"`][^'"`]+['"`]/i,
    /password\s*[:=]\s*['"`][^'"`]+['"`]/i,
    /token\s*[:=]\s*['"`][^'"`]+['"`]/i,
    /credential\s*[:=]\s*['"`][^'"`]+['"`]/i,
    /private_key\s*[:=]\s*['"`][^'"`]+['"`]/i,
    /access_key\s*[:=]\s*['"`][^'"`]+['"`]/i
];

const EXCLUDED_DIRS = [
    'node_modules',
    '.git',
    'venv',
    '__pycache__',
    'coverage',
    'tests'
];

const EXCLUDED_FILES = [
    'package-lock.json',
    'yarn.lock',
    '.env',
    '.env.example',
    'security-audit.js'
];

/**
 * Check if file should be excluded
 */
function shouldExcludeFile(filePath) {
    const fileName = path.basename(filePath);
    const dirName = path.dirname(filePath);

    // Check excluded files
    if (EXCLUDED_FILES.includes(fileName)) {
        return true;
    }

    // Check excluded directories
    for (const excludedDir of EXCLUDED_DIRS) {
        if (dirName.includes(excludedDir)) {
            return true;
        }
    }

    return false;
}

/**
 * Scan file for security issues
 */
function scanFile(filePath) {
    const issues = [];

    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        // Check for sensitive patterns
        SENSITIVE_PATTERNS.forEach((pattern, index) => {
            lines.forEach((line, lineNum) => {
                if (pattern.test(line)) {
                    issues.push({
                        type: 'sensitive_logging',
                        line: lineNum + 1,
                        content: line.trim(),
                        severity: 'high',
                        pattern: pattern.toString()
                    });
                }
            });
        });

        // Check for forbidden patterns
        FORBIDDEN_PATTERNS.forEach((pattern, index) => {
            lines.forEach((line, lineNum) => {
                if (pattern.test(line)) {
                    issues.push({
                        type: 'forbidden_pattern',
                        line: lineNum + 1,
                        content: line.trim(),
                        severity: 'critical',
                        pattern: pattern.toString()
                    });
                }
            });
        });

        // Check for innerHTML usage
        if (content.includes('innerHTML')) {
            const innerHTMLLines = lines
                .map((line, index) => ({ line: line.trim(), lineNum: index + 1 }))
                .filter(({ line }) => line.includes('innerHTML'));

            innerHTMLLines.forEach(({ line, lineNum }) => {
                issues.push({
                    type: 'xss_vulnerability',
                    line: lineNum,
                    content: line,
                    severity: 'high',
                    description: 'innerHTML usage detected - potential XSS vulnerability'
                });
            });
        }

        // Check for eval usage
        if (content.includes('eval(')) {
            const evalLines = lines
                .map((line, index) => ({ line: line.trim(), lineNum: index + 1 }))
                .filter(({ line }) => line.includes('eval('));

            evalLines.forEach(({ line, lineNum }) => {
                issues.push({
                    type: 'eval_usage',
                    line: lineNum,
                    content: line,
                    severity: 'critical',
                    description: 'eval() usage detected - security vulnerability'
                });
            });
        }

    } catch (error) {
        issues.push({
            type: 'file_error',
            line: 0,
            content: error.message,
            severity: 'medium',
            description: 'Failed to read file'
        });
    }

    return issues;
}

/**
 * Get all files to scan
 */
function getFilesToScan(dir = '.') {
    const files = [];

    function walkDir(currentDir) {
        const items = fs.readdirSync(currentDir);

        for (const item of items) {
            const fullPath = path.join(currentDir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                if (!shouldExcludeFile(fullPath)) {
                    walkDir(fullPath);
                }
            } else if (stat.isFile()) {
                if (!shouldExcludeFile(fullPath)) {
                    const ext = path.extname(fullPath);
                    if (['.js', '.ts', '.jsx', '.tsx', '.py', '.html', '.css'].includes(ext)) {
                        files.push(fullPath);
                    }
                }
            }
        }
    }

    walkDir(dir);
    return files;
}

/**
 * Run security audit
 */
function runSecurityAudit() {
    console.log('🔒 Starting Security Audit...\n');

    const files = getFilesToScan();
    console.log(`📁 Scanning ${files.length} files...\n`);

    const allIssues = [];
    let filesWithIssues = 0;

    for (const file of files) {
        const issues = scanFile(file);
        if (issues.length > 0) {
            allIssues.push({ file, issues });
            filesWithIssues++;
        }
    }

    // Print results
    console.log(`\n📊 Security Audit Results:\n`);
    console.log(`Files scanned: ${files.length}`);
    console.log(`Files with issues: ${filesWithIssues}`);
    console.log(`Total issues found: ${allIssues.reduce((sum, { issues }) => sum + issues.length, 0)}\n`);

    if (allIssues.length === 0) {
        console.log('✅ No security issues found!');
        return 0;
    }

    // Group issues by severity
    const criticalIssues = [];
    const highIssues = [];
    const mediumIssues = [];

    allIssues.forEach(({ file, issues }) => {
        issues.forEach(issue => {
            const issueWithFile = { ...issue, file };
            switch (issue.severity) {
                case 'critical':
                    criticalIssues.push(issueWithFile);
                    break;
                case 'high':
                    highIssues.push(issueWithFile);
                    break;
                case 'medium':
                    mediumIssues.push(issueWithFile);
                    break;
            }
        });
    });

    // Print critical issues
    if (criticalIssues.length > 0) {
        console.log(`🚨 CRITICAL ISSUES (${criticalIssues.length}):`);
        criticalIssues.forEach(issue => {
            console.log(`  ${issue.file}:${issue.line} - ${issue.type}`);
            console.log(`    ${issue.content}`);
            if (issue.description) {
                console.log(`    ${issue.description}`);
            }
            console.log('');
        });
    }

    // Print high severity issues
    if (highIssues.length > 0) {
        console.log(`⚠️  HIGH SEVERITY ISSUES (${highIssues.length}):`);
        highIssues.forEach(issue => {
            console.log(`  ${issue.file}:${issue.line} - ${issue.type}`);
            console.log(`    ${issue.content}`);
            if (issue.description) {
                console.log(`    ${issue.description}`);
            }
            console.log('');
        });
    }

    // Print medium severity issues
    if (mediumIssues.length > 0) {
        console.log(`ℹ️  MEDIUM SEVERITY ISSUES (${mediumIssues.length}):`);
        mediumIssues.forEach(issue => {
            console.log(`  ${issue.file}:${issue.line} - ${issue.type}`);
            console.log(`    ${issue.content}`);
            if (issue.description) {
                console.log(`    ${issue.description}`);
            }
            console.log('');
        });
    }

    // Summary
    console.log('📋 Summary:');
    console.log(`  Critical: ${criticalIssues.length}`);
    console.log(`  High: ${highIssues.length}`);
    console.log(`  Medium: ${mediumIssues.length}`);

    if (criticalIssues.length > 0) {
        console.log('\n❌ Security audit failed - critical issues found!');
        return 1;
    } else if (highIssues.length > 0) {
        console.log('\n⚠️  Security audit warning - high severity issues found!');
        return 2;
    } else {
        console.log('\n✅ Security audit passed!');
        return 0;
    }
}

/**
 * Generate security report
 */
function generateSecurityReport() {
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            filesScanned: 0,
            filesWithIssues: 0,
            totalIssues: 0,
            criticalIssues: 0,
            highIssues: 0,
            mediumIssues: 0
        },
        issues: []
    };

    const files = getFilesToScan();
    report.summary.filesScanned = files.length;

    for (const file of files) {
        const issues = scanFile(file);
        if (issues.length > 0) {
            report.summary.filesWithIssues++;
            report.issues.push({ file, issues });
        }
    }

    // Count issues by severity
    report.issues.forEach(({ issues }) => {
        issues.forEach(issue => {
            switch (issue.severity) {
                case 'critical':
                    report.summary.criticalIssues++;
                    break;
                case 'high':
                    report.summary.highIssues++;
                    break;
                case 'medium':
                    report.summary.mediumIssues++;
                    break;
            }
        });
    });

    report.summary.totalIssues = report.summary.criticalIssues +
                                report.summary.highIssues +
                                report.summary.mediumIssues;

    return report;
}

// Main execution
const args = process.argv.slice(2);

if (args.includes('--report')) {
    const report = generateSecurityReport();
    const reportFile = 'security-audit-report.json';
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`📄 Security report generated: ${reportFile}`);
} else {
    const exitCode = runSecurityAudit();
    process.exit(exitCode);
}

export {
    runSecurityAudit,
    generateSecurityReport,
    scanFile,
    getFilesToScan
};
