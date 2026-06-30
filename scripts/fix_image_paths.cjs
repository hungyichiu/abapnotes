#!/usr/bin/env node
// Convert relative path image refs like ![[../../assets/file.png]] -> ![[file.png]]
const fs = require('fs');
const path = require('path');

const dirs = process.argv.slice(2);

for (const dir of dirs) {
  for (const file of fs.readdirSync(dir).sort()) {
    if (!file.endsWith('.md')) continue;
    const fp = path.join(dir, file);
    const content = fs.readFileSync(fp, 'utf8');

    // Match ![[path/to/file.ext]] or ![[path/to/file.ext|alias]]
    // Strip everything up to and including the last / or \
    const fixed = content.replace(/!\[\[([^\]]*[/\\][^\]|]+)(\|[^\]]*)?\]\]/g, (match, pathPart, alias) => {
      const filename = pathPart.split(/[/\\]/).pop();
      return alias ? `![[${filename}${alias}]]` : `![[${filename}]]`;
    });

    if (fixed !== content) {
      fs.writeFileSync(fp, fixed, 'utf8');
      console.log('Fixed: ' + file);
    }
  }
}
console.log('Done.');
