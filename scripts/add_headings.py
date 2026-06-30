#!/usr/bin/env python3
"""
Convert parent bullet points (bullets that have sub-bullets) to headings.
Starting heading level is determined by the deepest existing heading in the file.
Only processes lines starting with "- " or "* ", not numbered lists.
Skips content inside code blocks.
"""
import re
import os
import sys

def is_bullet_line(line):
    stripped = line.lstrip()
    return bool(re.match(r'^[-*] ', stripped))

def get_indent(line):
    return len(line) - len(line.lstrip())

def get_max_heading_level(lines, code_lines):
    max_level = 0
    for i, line in enumerate(lines):
        if i in code_lines:
            continue
        m = re.match(r'^(#{1,6}) ', line)
        if m:
            max_level = max(max_level, len(m.group(1)))
    return max_level

def find_code_lines(lines):
    in_code = False
    code_lines = set()
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('```'):
            if not in_code:
                in_code = True
            else:
                in_code = False
            code_lines.add(i)
        elif in_code:
            code_lines.add(i)
    return code_lines

def transform_content(content):
    lines = content.split('\n')
    n = len(lines)

    code_lines = find_code_lines(lines)
    max_heading = get_max_heading_level(lines, code_lines)
    # Start bullets at one level below the deepest existing heading, min H2
    start_level = max(max_heading + 1, 2)

    # Find parent bullets: bullet lines whose next non-empty sibling is a deeper bullet
    parent_bullets = {}  # line_idx -> raw indent size
    for i, line in enumerate(lines):
        if i in code_lines:
            continue
        if not is_bullet_line(line):
            continue
        curr_indent = get_indent(line)
        for j in range(i + 1, n):
            if not lines[j].strip():
                continue
            if j in code_lines:
                break
            next_line = lines[j]
            next_indent = get_indent(next_line)
            if is_bullet_line(next_line) and next_indent > curr_indent:
                parent_bullets[i] = curr_indent
            break

    if not parent_bullets:
        return content

    # Map each unique indent level to a depth offset (0, 1, 2, ...)
    indent_levels = sorted(set(parent_bullets.values()))
    indent_to_depth = {indent: depth for depth, indent in enumerate(indent_levels)}

    result = []
    for i, line in enumerate(lines):
        if i in code_lines:
            result.append(line)
            continue
        if i in parent_bullets:
            indent = parent_bullets[i]
            depth = indent_to_depth[indent]
            heading_level = min(start_level + depth, 6)
            stripped = line.lstrip()
            text = re.sub(r'^[-*] +', '', stripped)
            result.append('#' * heading_level + ' ' + text)
        else:
            result.append(line)

    return '\n'.join(result)

def process_dir(directory, dry_run=False):
    changed = []
    for filename in sorted(os.listdir(directory)):
        if not filename.endswith('.md'):
            continue
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        new_content = transform_content(content)
        if new_content != content:
            changed.append(filename)
            if not dry_run:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
    return changed

def preview_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    new_content = transform_content(content)
    if new_content == content:
        print("No changes.")
        return
    old_lines = content.split('\n')
    new_lines = new_content.split('\n')
    for i, (old, new) in enumerate(zip(old_lines, new_lines)):
        if old != new:
            print(f"L{i+1:03d}  OLD: {old.rstrip()}")
            print(f"      NEW: {new.rstrip()}")
            print()

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: add_headings.py <directory|file> [--dry-run] [--preview <file>]")
        sys.exit(1)

    if '--preview' in sys.argv:
        idx = sys.argv.index('--preview')
        preview_file(sys.argv[idx + 1])
    elif '--dry-run' in sys.argv:
        changed = process_dir(sys.argv[1], dry_run=True)
        print(f"\nFiles that would be changed ({len(changed)}):")
        for f in changed:
            print(f"  {f}")
    else:
        changed = process_dir(sys.argv[1])
        print(f"Done. Modified {len(changed)} files:")
        for f in changed:
            print(f"  {f}")
