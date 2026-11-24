#!/usr/bin/env python3
"""Verify one real application against HR API, PostgreSQL and public GitHub. No fixtures."""
import argparse
import json
import os
import subprocess
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen
from uuid import UUID


def require(condition, message):
    if not condition:
        raise ValueError(message)


def get(url, headers):
    with urlopen(Request(url, headers=headers), timeout=25) as response:
        return json.load(response)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--application-id', required=True, type=UUID)
    p.add_argument('--expected', required=True, choices=['active', 'neutral', 'declined'])
    p.add_argument('--base-url', default='http://localhost:8080')
    p.add_argument('--output-dir', required=True, type=Path)
    args = p.parse_args()
    aid = str(args.application_id)
    token = os.environ.get('MIDCV_HR_TOKEN')
    require(token, 'Set MIDCV_HR_TOKEN (HR with detailed score access).')
    try:
        payload = get(args.base_url.rstrip('/') + f'/api/v1/matching/applications/{aid}/inspection',
                      {'Authorization': f'Bearer {token}', 'Accept': 'application/json'})
        inspection = payload.get('data', payload)
        require(inspection.get('applicationId') == aid, 'Application ID mismatch')
    except HTTPError as error:
        if args.expected != 'declined' or error.code != 403:
            raise
        inspection = {}
        # A forbidden inspection must not mask an invalid HR session or wrong company.
        application = get(args.base_url.rstrip('/') + f'/api/v1/recruiter/applications/{aid}',
                          {'Authorization': f'Bearer {token}', 'Accept': 'application/json'})
        application = application.get('data', application)
        require(application.get('id') == aid and application.get('aiAnalysisConsent') is False,
                'HR must still be authorized to view the declined application')
    sql = f"""SELECT row_to_json(r) FROM (
        SELECT a.id, a.ai_analysis_consent AS consent, a.github_snapshot_contract AS contract,
        a.github_username_snapshot AS username, a.github_scan_snapshot::jsonb AS scan,
        a.applied_cv_version_id AS cv_version, a.applied_jd_version_id AS jd_version,
        m.cv_version_id AS result_cv_version, m.jd_version_id AS result_jd_version,
        m.status AS calculation_status, m.core_score, m.github_score, m.overall_score,
        m.core_weight, m.github_weight, m.is_github_active AS github_active,
        m.github_assessment_snapshot::jsonb AS assessment,
        EXISTS(SELECT 1 FROM user_oauth_accounts o JOIN candidate_profiles c ON c.user_id=o.user_id
        WHERE c.id=a.candidate_id AND o.provider='github' AND o.provider_subject=a.github_scan_snapshot::jsonb->>'github_user_id'
        AND lower(o.provider_login)=lower(a.github_username_snapshot)) AS linked_identity
        FROM applications a LEFT JOIN match_results m ON m.application_id=a.id WHERE a.id='{aid}'
    ) r;"""
    result = subprocess.run(['psql','-X','-A','-t','-v','ON_ERROR_STOP=1','-c',sql], capture_output=True, text=True, check=True)
    rows = [x for x in result.stdout.splitlines() if x.strip()]
    require(len(rows) == 1, 'Expected exactly one application')
    row = json.loads(rows[0])
    require(row['contract'] == 'public-evidence-v1', 'Use a new application submitted after migration V45')
    public_checks = []
    if args.expected == 'declined':
        require(row['consent'] is False and row['scan'] is None and row['github_score'] is None,
                'Declined application has GitHub scoring data')
        require(inspection.get('githubScore') is None and inspection.get('overallScore') is None,
                'Declined application exposed score')
    else:
        require(row['calculation_status'] == inspection.get('calculationStatus') == 'PGVECTOR_READY', 'Final detailed result required')
        require(row['cv_version'] == row['result_cv_version'] == inspection.get('cvVersionId'), 'CV version mismatch')
        require(row['jd_version'] == row['result_jd_version'] == inspection.get('jdVersionId'), 'JD version mismatch')
        for db, api in [('core_score','coreScore'),('github_score','githubScore'),('overall_score','overallScore')]:
            require(row[db] == inspection.get(api), f'Score mismatch: {db}')
        if args.expected == 'neutral':
            require(row['github_score'] is None and row['github_weight'] == 0 and row['core_weight'] == 1
                    and row['core_score'] == row['overall_score'] and not row['github_active'], 'Neutral fallback not respected')
        else:
            scan = row['scan'] or {}
            assessment = inspection.get('githubAssessment') or {}
            require(row['consent'] and row['linked_identity'] and row['github_active'], 'No consent, OAuth subject or active score')
            require(scan.get('ownership_status') == 'OWNED' and scan.get('status') == 'AVAILABLE' and not scan.get('language_partial'), 'Incomplete/unverified scan')
            require(assessment.get('scoringEligible') is True and assessment.get('repos'), 'Missing HR evidence')
            require(assessment == row['assessment'], 'HR assessment differs from persisted result')
            d = lambda x: Decimal(str(x))
            require(0 < d(row['github_weight']) <= d('0.15') and d(row['core_weight']) + d(row['github_weight']) == 1, 'Invalid weights')
            expected = d(row['core_score'])*d(row['core_weight']) + d(row['github_score'])*d(row['github_weight'])
            require(abs(expected - d(row['overall_score'])) <= d('0.01'), 'Overall score cannot be reconstructed')
            headers = {'Accept':'application/vnd.github+json','User-Agent':'midcv-live-acceptance','X-GitHub-Api-Version':'2022-11-28'}
            if os.environ.get('GITHUB_TOKEN'):
                headers['Authorization'] = 'Bearer ' + os.environ['GITHUB_TOKEN']
            handle = scan['username']
            profile = get('https://api.github.com/users/' + quote(handle,safe=''), headers)
            require(str(profile['id']) == str(scan['github_user_id']), 'Current GitHub identity differs')
            stored = {r['url']:r for r in scan['repos']}
            for repo in assessment['repos']:
                raw = stored.get(repo.get('url'))
                require(raw is not None and not raw.get('fork') and not raw.get('archived'), 'Repository not in saved scan')
                path = 'https://api.github.com/repos/' + quote(handle,safe='') + '/' + quote(raw['name'],safe='')
                now = get(path,headers)
                require(not now['private'] and not now['fork'] and not now['archived'] and str(now['owner']['id']) == str(profile['id']), 'Public repository ownership changed')
                langs = get(path+'/languages',headers)
                public_checks.append({'url':raw['url'],'saved_languages':raw['languages'],'current_languages':langs,
                                      'changed_since_scan':raw['languages'] != langs})
            require(any(c['saved_languages'] for c in public_checks), 'No recorded language-byte evidence')
    args.output_dir.mkdir(parents=True, exist_ok=True)
    report = {'result':'GITHUB_LIVE_VERIFIED','case':args.expected,'application_id':aid,
              'checked_at':datetime.now(timezone.utc).isoformat(),'core_score':row['core_score'],
              'github_score':row['github_score'],'overall_score':row['overall_score'],
              'core_weight':row['core_weight'],'github_weight':row['github_weight'],
              'scan_status':(row['scan'] or {}).get('status'), 'linked_identity':row['linked_identity'],
              'versions':{'cv':row['cv_version'],'jd':row['jd_version']}, 'public_repository_checks':public_checks}
    (args.output_dir/'github-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2))


if __name__ == '__main__':
    main()
