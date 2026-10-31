#!/usr/bin/env python3
"""Repeatable local verification; HTTP mode creates a NEW disposable database only."""
from __future__ import annotations
import argparse
from datetime import datetime
import getpass
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]


def execute(args, cwd, env, log=None):
    command = subprocess.list2cmdline(args) if os.name == 'nt' else args
    batch = os.name == 'nt' and str(args[0]).lower().endswith(('.cmd', '.bat'))
    if log is None:
        result = subprocess.run(command, cwd=cwd, env=env, shell=batch,
                                stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        return result.returncode, result.stdout.decode('utf-8', errors='replace')
    with log.open('w', encoding='utf-8') as output:
        result = subprocess.Popen(command, cwd=cwd, env=env, shell=batch,
                                  stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        assert result.stdout is not None
        for raw in result.stdout:
            text = raw.decode('utf-8', errors='replace')
            output.write(text)
            print(text, end='', flush=True)
        return result.wait(), ''


def select_jdk(env):
    candidates = [env.get('MIDCV_JDK21_HOME'), env.get('JAVA_HOME')]
    candidates += [str(p) for p in (Path.home() / '.jdks').glob('*')]
    if os.name == 'nt':
        for vendor in ('Eclipse Adoptium', 'Microsoft', 'Java', 'Zulu'):
            candidates += [str(p) for p in (Path(env.get('ProgramFiles', 'C:/Program Files')) / vendor).glob('*')]
    suffix = '.exe' if os.name == 'nt' else ''
    for candidate in candidates:
        if not candidate:
            continue
        root = Path(candidate)
        java, javac = root / 'bin' / ('java' + suffix), root / 'bin' / ('javac' + suffix)
        if not java.is_file() or not javac.is_file():
            continue
        code, text = execute([str(java), '-version'], ROOT, env)
        if code == 0 and re.search(r'version\s+"21(?:\.|["+-])', text):
            env['JAVA_HOME'] = str(root)
            env['PATH'] = str(root / 'bin') + os.pathsep + env.get('PATH', '')
            return
    raise RuntimeError('JDK 21 is required. Set MIDCV_JDK21_HOME to a JDK 21 installation directory.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backend-only', action='store_true', help='Skip frontend checks')
    parser.add_argument('--http', action='store_true', help='Real HTTP/PostgreSQL acceptance against a newly created test database')
    parser.add_argument('--container', help='Reuse a running disposable pgvector container; omit to create a new one')
    parser.add_argument('--port', type=int, default=55439)
    parser.add_argument('--database-user', default='midcv_test')
    args = parser.parse_args()
    env = os.environ.copy()
    select_jdk(env)
    maven = shutil.which('mvn', path=env['PATH'])
    if not maven:
        raise RuntimeError('Maven is not available on PATH.')
    code, version = execute([maven, '-v'], ROOT, env)
    if code or not re.search(r'Java version:\s*21(?:\.|\s|,)', version):
        raise RuntimeError('Maven did not start on JDK 21. Check its launcher and JAVA_HOME.')
    print(version)
    destination = ROOT / 'diagnostics' / ('business-tasks-' + datetime.now().strftime('%Y%m%d-%H%M%S') + '-' + uuid.uuid4().hex[:6])
    destination.mkdir(parents=True)
    report = {'started_at': datetime.now().astimezone().isoformat(), 'jdk': 21,
              'commands': [], 'live_acceptance': 'NOT_EXECUTED', 'source': 'local checkout'}
    agent = env.get('MIDCV_TEST_JAVA_AGENT')
    flags = ['-DargLine=-javaagent:' + str(Path(agent).resolve())] if agent else []
    if args.http:
        if args.container and not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,127}', args.container):
            raise RuntimeError('Invalid container name.')
        if not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]{0,62}', args.database_user):
            raise RuntimeError('Invalid database role name.')
        if not 1 <= args.port <= 65535:
            raise RuntimeError('Invalid PostgreSQL port.')
        docker = shutil.which('docker')
        if not docker:
            raise RuntimeError('Docker CLI is unavailable. Start Docker Desktop before HTTP acceptance.')
        password = getpass.getpass('Disposable PostgreSQL password (hidden): ')
        if not password:
            raise RuntimeError('A nonempty disposable database password is required.')
        if args.container:
            code, running = execute([docker, 'container', 'inspect', '--format', '{{.State.Running}}', args.container], ROOT, env)
            if code or running.strip() != 'true':
                raise RuntimeError('Disposable PostgreSQL container is not running.')
        else:
            args.container = 'midcv-business-' + uuid.uuid4().hex[:12]
            docker_env = env.copy()
            docker_env['POSTGRES_PASSWORD'] = password
            print('Starting NEW disposable container: ' + args.container, flush=True)
            code, message = execute([docker, 'run', '-d', '--name', args.container,
                    '-p', f'127.0.0.1:{args.port}:5432', '-e', 'POSTGRES_PASSWORD',
                    '-e', 'POSTGRES_USER=' + args.database_user, '-e', 'POSTGRES_DB=midcv_seed',
                    'pgvector/pgvector:pg16'], ROOT, docker_env)
            if code:
                raise RuntimeError('Could not start the new disposable container: ' + message.strip())
            report['created_container'] = args.container
            deadline = time.monotonic() + 60
            while True:
                code, _ = execute([docker, 'exec', args.container, 'pg_isready', '-U', args.database_user, '-d', 'midcv_seed'], ROOT, env)
                if code == 0:
                    break
                if time.monotonic() > deadline:
                    raise RuntimeError('New PostgreSQL container did not become ready within 60 seconds.')
                time.sleep(1)
        report['container'] = args.container
        database = 'midcv_task_' + uuid.uuid4().hex
        code, message = execute([docker, 'exec', args.container, 'createdb', '-U', args.database_user, database], ROOT, env)
        if code:
            raise RuntimeError('Could not create a NEW test database: ' + message.strip())
        env.update(DATABASE_URL=f'jdbc:postgresql://127.0.0.1:{args.port}/{database}',
                   DATABASE_USERNAME=args.database_user, DATABASE_PASSWORD=password,
                   MIDCV_TASK_HTTP='true', WORKER_ENABLED='false', MIDCV_INBOX_EMAIL_ENABLED='false',
                   ADMIN_INITIAL_EMAIL='', EMAIL_MODE='MOCK')
        report['test_database'] = database
        report['live_acceptance'] = 'HTTP_POSTGRES_ONLY_SMTP_AND_PROVIDER_NOT_TESTED'
        steps = [('http-postgres', [maven, *flags, '-Dtest=TaskHttpAcceptanceTest', 'test'], ROOT / 'backend')]
    else:
        # Do not accidentally inherit opt-in live-test flags from another terminal workflow.
        for name in ('MIDCV_TASK_HTTP', 'MIDCV_INBOX_TEST_URL', 'MIDCV_MIGRATION_TEST_MODE'):
            env.pop(name, None)
        test_names = [line.strip() for line in (ROOT / 'scripts/business-task-tests.txt').read_text().splitlines()
                      if line.strip() and not line.startswith('#')]
        steps = [('backend-regression', [maven, *flags, '-Dtest=' + ','.join(test_names), 'clean', 'test'], ROOT / 'backend'),
                 ('backend-package', [maven, '-DskipTests', 'package'], ROOT / 'backend'),
                 ('worker-runtime-contract', [sys.executable, 'ai-worker/tests/test_runtime_configuration_contract.py'], ROOT)]
        if not args.backend_only:
            npm = shutil.which('npm', path=env['PATH'])
            if not npm:
                raise RuntimeError('npm is not available on PATH.')
            steps += [('frontend-install', [npm, 'ci'], ROOT / 'frontend'),
                      ('frontend-contracts', [npm, 'run', 'test:contracts'], ROOT / 'frontend'),
                      ('frontend-types', [shutil.which('node', path=env['PATH']) or 'node', 'node_modules/typescript/bin/tsc', '--noEmit'], ROOT / 'frontend'),
                      ('frontend-build', [npm, 'run', 'build'], ROOT / 'frontend')]
    failed = False
    try:
        for name, command, working in steps:
            print('\n=== ' + name + ' ===', flush=True)
            code, _ = execute(command, working, env, destination / (name + '.log'))
            report['commands'].append({'name': name, 'exit_code': code, 'log': name + '.log'})
            if code:
                failed = True
                break
    finally:
        report['finished_at'] = datetime.now().astimezone().isoformat()
        report['checks_passed'] = not failed and len(report['commands']) == len(steps)
        (destination / 'verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
        print('\nEvidence: ' + str(destination))
        if not args.http:
            print('These checks do not accept PostgreSQL migrations, provider OAuth, production SMTP or process restart.')
    return 1 if failed else 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (RuntimeError, OSError) as error:
        print('Verification stopped: ' + str(error), file=sys.stderr)
        raise SystemExit(1)
