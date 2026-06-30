#!/usr/bin/env node
/**
 * Convert parent bullet points (bullets with sub-bullets) to H1-H6 headings.
 * Starting level = max existing heading level in file + 1 (min H2).
 * Only converts "- " and "* " bullets, not numbered lists.
 * Skips code blocks.
 */
const fs = require('fs');
const path = require('path');

function findCodeLines(lines) {
  const codeLines = new Set();
  let inCode = false;
  for (let i = 0; i < lines.length; i++) {
    const s = lines[i].trim();
    if (s.startsWith('```')) {
      if (!inCode) inCode = true;
      else inCode = false;
      codeLines.add(i);
    } else if (inCode) {
      codeLines.add(i);
    }
  }
  return codeLines;
}

function isBullet(line) {
  return /^[ \t]*[-*] /.test(line);
}

function getIndent(line) {
  return line.length - line.trimStart().length;
}

function getMaxHeadingLevel(lines, codeLines) {
  let max = 0;
  for (let i = 0; i < lines.length; i++) {
    if (codeLines.has(i)) continue;
    const m = lines[i].match(/^(#{1,6}) /);
    if (m) max = Math.max(max, m[1].length);
  }
  return max;
}

function transform(content) {
  const lines = content.split('\n');
  const n = lines.length;
  const codeLines = findCodeLines(lines);
  const maxHeading = getMaxHeadingLevel(lines, codeLines);
  const startLevel = Math.max(maxHeading + 1, 2);

  // Find parent bullets
  const parentBullets = new Map(); // lineIdx -> rawIndent
  for (let i = 0; i < n; i++) {
    if (codeLines.has(i)) continue;
    if (!isBullet(lines[i])) continue;
    const currIndent = getIndent(lines[i]);

    for (let j = i + 1; j < n; j++) {
      if (!lines[j].trim()) continue;
      if (codeLines.has(j)) break;
      const nextIndent = getIndent(lines[j]);
      if (isBullet(lines[j]) && nextIndent > currIndent) {
        parentBullets.set(i, currIndent);
      }
      break;
    }
  }

  if (parentBullets.size === 0) return content;

  // Map indent levels to depth offsets
  const indentLevels = [...new Set(parentBullets.values())].sort((a, b) => a - b);
  const indentToDepth = new Map(indentLevels.map((indent, depth) => [indent, depth]));

  const result = [];
  for (let i = 0; i < n; i++) {
    if (codeLines.has(i)) {
      result.push(lines[i]);
      continue;
    }
    if (parentBullets.has(i)) {
      const indent = parentBullets.get(i);
      const depth = indentToDepth.get(indent);
      const level = Math.min(startLevel + depth, 6);
      const stripped = lines[i].trimStart();
      const text = stripped.replace(/^[-*] +/, '');
      result.push('#'.repeat(level) + ' ' + text);
    } else {
      result.push(lines[i]);
    }
  }
  return result.join('\n');
}

function processDir(dir, dryRun = false) {
  const changed = [];
  for (const filename of fs.readdirSync(dir).sort()) {
    if (!filename.endsWith('.md')) continue;
    const filepath = path.join(dir, filename);
    const content = fs.readFileSync(filepath, 'utf8');
    const newContent = transform(content);
    if (newContent !== content) {
      changed.push(filename);
      if (!dryRun) fs.writeFileSync(filepath, newContent, 'utf8');
    }
  }
  return changed;
}

function previewFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  const newContent = transform(content);
  if (newContent === content) { console.log('No changes.'); return; }
  const oldLines = content.split('\n');
  const newLines = newContent.split('\n');
  for (let i = 0; i < oldLines.length; i++) {
    if (oldLines[i] !== newLines[i]) {
      console.log(`L${String(i+1).padStart(3,'0')}  OLD: ${oldLines[i]}`);
      console.log(`      NEW: ${newLines[i]}`);
      console.log();
    }
  }
}

const args = process.argv.slice(2);
if (args.includes('--preview')) {
  const idx = args.indexOf('--preview');
  previewFile(args[idx + 1]);
} else if (args.includes('--dry-run')) {
  const changed = processDir(args[0], true);
  console.log(`\nFiles that would change (${changed.length}):`);
  changed.forEach(f => console.log('  ' + f));
} else {
  const changed = processDir(args[0]);
  console.log(`Done. Modified ${changed.length} files:`);
  changed.forEach(f => console.log('  ' + f));
}
