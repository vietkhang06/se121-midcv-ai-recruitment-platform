"""Track explicit Java module imports and prevent new cross-module repository access.

Existing cycles/dependencies are recorded as debt, not silently claimed resolved.
Run without --write-baseline in CI. Updating the baseline requires architectural review.
"""
from __future__ import annotations
import argparse
import json
import re
from pathlib import Path

PREFIX = 'com.platform.recruitment.'

def inspect(root: Path):
    edges, repository_access = set(), set()
    for file in sorted(root.rglob('*.java')):
        source = file.read_text(encoding='utf-8-sig')
        package = re.search(r'^package\s+com\.platform\.recruitment\.([\w.]+);', source, re.M)
        if not package:
            continue
        owner = package[1].split('.')[0]
        # Both explicit imports and fully qualified references; comments may be conservative positives.
        for ref in re.findall(r'com\.platform\.recruitment\.([A-Za-z0-9_.$]+)', source):
            target = ref.split('.')[0]
            if target == owner:
                continue
            edges.add((owner, target))
            if ref.split('.')[-1].endswith('Repository'):
                repository_access.add(f'{file.relative_to(root).as_posix()} -> {ref}')
    return edges, repository_access

def strongly_connected(edges):
    nodes = {v for pair in edges for v in pair}
    reach = {n: {b for a,b in edges if a == n} for n in nodes}
    for k in nodes:
        for n in nodes:
            if k in reach[n]: reach[n] |= reach[k]
    remaining = set(nodes); result = []
    while remaining:
        n = min(remaining)
        group = {v for v in remaining if v == n or v in reach[n] and n in reach[v]}
        remaining -= group
        if len(group)>1: result.append(sorted(group))
    return sorted(result)

def snapshot(root):
    edges, accesses = inspect(root)
    return {'schema_version': 1, 'scope': 'explicit Java references; not reflection/runtime dependencies',
            'edges': [list(e) for e in sorted(edges)],
            'cross_module_repository_access': sorted(accesses), 'cycles': strongly_connected(edges)}

def violations(current, baseline):
    added = set(current['cross_module_repository_access']) - set(baseline['cross_module_repository_access'])
    old_edges = {tuple(e) for e in baseline['edges']}
    cyclic_nodes = [set(c) for c in current['cycles']]
    new_cycle_edges = [e for e in current['edges'] if tuple(e) not in old_edges and any(set(e)<=g for g in cyclic_nodes)]
    return sorted(added), new_cycle_edges

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write-baseline', action='store_true')
    args=parser.parse_args()
    repo=Path(__file__).resolve().parents[1]
    baseline=repo/'docs/architecture/module-debt-baseline.json'
    current=snapshot(repo/'backend/src/main/java/com/platform/recruitment')
    if args.write_baseline:
        baseline.parent.mkdir(parents=True,exist_ok=True)
        baseline.write_text(json.dumps(current,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print('Baseline written; existing debt is NOT resolved.')
        return 0
    added, cycle_edges=violations(current,json.loads(baseline.read_text(encoding='utf-8')))
    print(f"Existing cross-module repository references: {len(current['cross_module_repository_access'])}; cyclic groups: {len(current['cycles'])}")
    for item in added: print('NEW REPOSITORY ACCESS:',item)
    for item in cycle_edges: print('NEW CYCLIC EDGE:', ' -> '.join(item))
    print('Boundary regression check:', 'FAIL' if added or cycle_edges else 'PASS')
    return int(bool(added or cycle_edges))

if __name__=='__main__': raise SystemExit(main())
