#!/usr/bin/env node

/**
 * Script to migrate JavaScript files from old class names to Antares Design System
 * Usage: node scripts/migrate-to-antares.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Class name mappings
const CLASS_MAPPINGS = {
    // Buttons
    'control-button': 'control-button gd-button',
    'control-button secondary': 'control-button secondary gd-button-secondary',
    'filter-btn': 'filter-btn gd-button-outline',
    'filter-btn rad-filter-btn': 'filter-btn rad-filter-btn gd-button-outline',
    'preset-button': 'preset-button gd-button-small',

    // Cards
    'card': 'card gd-card',
    'event-card': 'event-card gd-card',

    // Inputs
    'control-input': 'control-input gd-input',
    'search-input': 'search-input gd-input',
    'form-control': 'form-control gd-input',

    // Status indicators
    'badge critical': 'badge critical gd-badge-error',
    'badge warning': 'badge warning gd-badge-warning',
    'badge normal': 'badge normal gd-badge-success',
    'badge increased': 'badge increased gd-badge-info',
    'badge': 'badge gd-badge',

    // Layout
    'modal-content': 'modal-content gd-modal',
    'modal-header': 'modal-header gd-modal-header',
    'modal-body': 'modal-body gd-modal-body',
};

// Files to process - expanded list
const JS_FILES = [
    'assets/js/ui-updater.js',
    'assets/js/dashboard-main.js',
    'assets/js/config-editor.js',
    'assets/js/formula-builder/ui/visual-builder.js',
    'assets/js/formula-builder/ui/enhanced-visual-builder.js',
    'assets/js/visual-formula-builder-integration.js',
    'assets/js/main-clean.js',
    'assets/js/dashboard-simplified.js',
    'assets/js/production-helper.js',
    'assets/js/cookie-modal.js',
    'assets/js/search-filter.js',
];

function updateClassNames(content) {
    let updated = content;

    // Sort mappings by length (longest first) to avoid partial replacements
    const sortedMappings = Object.entries(CLASS_MAPPINGS).sort((a, b) => b[0].length - a[0].length);

    sortedMappings.forEach(([oldClass, newClass]) => {
        // Pattern 1: classList.add('class')
        const pattern1 = new RegExp(`classList\\.add\\(['"\`]${escapeRegExp(oldClass)}['"\`]\\)`, 'g');
        updated = updated.replace(pattern1, `classList.add('${newClass}')`);

        // Pattern 2: className = 'class'
        const pattern2 = new RegExp(`className\\s*=\\s*['"\`]${escapeRegExp(oldClass)}['"\`]`, 'g');
        updated = updated.replace(pattern2, `className = '${newClass}'`);

        // Pattern 3: class="..." in template literals
        const pattern3 = new RegExp(`class=["']${escapeRegExp(oldClass)}["']`, 'g');
        updated = updated.replace(pattern3, `class="${newClass}"`);

        // Pattern 4: className="${...}" in template literals
        const pattern4 = new RegExp(`className=["']${escapeRegExp(oldClass)}["']`, 'g');
        updated = updated.replace(pattern4, `className="${newClass}"`);

        // Pattern 5: <element class="..."> in strings
        const pattern5 = new RegExp(`(<[^>]+\\sclass=["'])${escapeRegExp(oldClass)}(["'][^>]*>)`, 'g');
        updated = updated.replace(pattern5, `$1${newClass}$2`);
    });

    return updated;
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function processFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filePath}`);
        return;
    }

    console.log(`Processing: ${filePath}`);

    // Read file
    const content = fs.readFileSync(filePath, 'utf8');

    // Update class names
    const updated = updateClassNames(content);

    if (content !== updated) {
        // Backup original
        const backupPath = filePath + '.pre-antares';
        if (!fs.existsSync(backupPath)) {
            fs.writeFileSync(backupPath, content);
        }

        // Write updated content
        fs.writeFileSync(filePath, updated);
        console.log(`(✓)Updated: ${filePath}`);
    } else {
        console.log(`⏭️  No changes needed: ${filePath}`);
    }
}

// Main execution
console.log('🎨 Migrating to Antares Design System...\n');

JS_FILES.forEach(processFile);

console.log('\n✨ Migration complete!');
console.log('📝 Original files backed up with .pre-antares extension');
console.log('\n⚠️  Please test your application thoroughly after these changes.');
