#!/usr/bin/env python3
"""Remove superseded build artifacts, retaining the latest complete build(s)."""
import json
import os
import urllib.request
from collections import defaultdict
from pathlib import Path

repo = os.environ['GITHUB_REPOSITORY']
assert repo in ('mauriziocuneo-hue/Ohana-street', 'mauriziocuneo-hue/Ohana-street-web')
keep = 1 if repo.endswith('/Ohana-street') else 2
token = os.environ['GH_TOKEN']

def api(path, method='GET'):
    req = urllib.request.Request('https://api.github.com/repos/' + repo + path,
        headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json',
                 'X-GitHub-Api-Version': '2022-11-28'}, method=method)
    with urllib.request.urlopen(req, timeout=30) as response:
        raw = response.read()
        return json.loads(raw) if raw else None

artifacts = []
page = 1
while True:
    chunk = api('/actions/artifacts?per_page=100&page=' + str(page))['artifacts']
    artifacts.extend(chunk)
    if len(chunk) < 100:
        break
    page += 1

groups = defaultdict(list)
for artifact in artifacts:
    if not artifact.get('expired'):
        groups[artifact['name']].append(artifact)
deleted = []
retained = []
for name, versions in groups.items():
    versions.sort(key=lambda a: (a['created_at'], a['id']), reverse=True)
    retained.extend(versions[:keep])
    for artifact in versions[keep:]:
        # An upload from a running job must never be removed.
        run_id = artifact.get('workflow_run', {}).get('id')
        if not run_id or api('/actions/runs/' + str(run_id))['status'] != 'completed':
            retained.append(artifact)
            continue
        api('/actions/artifacts/' + str(artifact['id']), method='DELETE')
        deleted.append({k: artifact[k] for k in ('id', 'name', 'size_in_bytes')})

report = {'repository': repo, 'retained_per_name': keep, 'deleted_count': len(deleted),
          'recovered_bytes': sum(a['size_in_bytes'] for a in deleted),
          'remaining_bytes': sum(a['size_in_bytes'] for a in retained), 'deleted': deleted}
Path('cleanup-report.json').write_text(json.dumps(report, indent=2) + '\n')
summary = os.environ.get('GITHUB_STEP_SUMMARY')
if summary:
    with open(summary, 'a') as output:
        output.write('## Archivi temporanei OHANA\n\n')
        output.write(f"Rimosse {len(deleted)} versioni superate. Recuperati {report['recovered_bytes']/1048576:.1f} MiB. ")
        output.write(f"Conservati {report['remaining_bytes']/1048576:.1f} MiB.\n")
print(json.dumps(report, indent=2))
