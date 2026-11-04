"""Read-only import inventory. This reports candidates; it never deletes source."""
from pathlib import Path
import re
root = Path(__file__).resolve().parents[1]
source = root / 'frontend/src'
files = {p.resolve() for p in source.rglob('*') if p.is_file()}
edges = {}
for file in files:
    if file.suffix not in {'.ts', '.tsx', '.css'}:
        continue
    dependencies = set()
    for spec in re.findall(r'''(?:from\s*|import\s*\(\s*|import\s*)["']([^"']+)["']''', file.read_text(encoding='utf-8')):
        target = source / spec[2:] if spec.startswith('@/') else file.parent / spec if spec.startswith('.') else None
        if target is None:
            continue
        options = [target, *[Path(str(target) + ext) for ext in ['.ts', '.tsx', '.css']], target / 'index.ts', target / 'index.tsx']
        if target.suffix in {'.js','.jsx'}:
            options += [target.with_suffix('.ts'), target.with_suffix('.tsx')]
        for option in options:
            if option.resolve() in files:
                dependencies.add(option.resolve())
                break
    edges[file] = dependencies
queue = [p for p in files if '/app/' in p.as_posix() and p.name in {'page.tsx','layout.tsx','template.tsx','error.tsx','loading.tsx','not-found.tsx'}]
visited = set()
while queue:
    file = queue.pop()
    if file in visited:
        continue
    visited.add(file)
    queue.extend(edges.get(file, []))
print('No deletion performed. Dynamic computed imports and test-only utilities require review.')
for file in sorted(files - visited):
    if file.suffix in {'.ts','.tsx'}:
        print(file.relative_to(root).as_posix())
