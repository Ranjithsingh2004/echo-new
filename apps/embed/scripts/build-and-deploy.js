#!/usr/bin/env node
import { execSync } from 'child_process';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔨 Building embed script...');
execSync('npm run build', { stdio: 'inherit', cwd: resolve(__dirname, '..') });

const source = resolve(__dirname, '../dist/widget.iife.js');
const destination = resolve(__dirname, '../../widget/public/widget.js');

// Ensure destination directory exists
const destDir = dirname(destination);
if (!existsSync(destDir)) {
  mkdirSync(destDir, { recursive: true });
}

console.log('📦 Copying to widget/public...');
copyFileSync(source, destination);

console.log('✅ Build and deploy complete!');
console.log(`   Source: ${source}`);
console.log(`   Destination: ${destination}`);
