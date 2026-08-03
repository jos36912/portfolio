#!/usr/bin/env python3
"""Sincroniza data/content.json con los datos actuales de Supabase.

Preserva las secciones estaticas (site y sections) del archivo existente y
reemplaza los datos (profile, experience, education, projects, skills, contact)
con el contenido actual de las tablas en Supabase. Uso:

    python3 sync-content.py
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONFIG_PATH = ROOT / 'supabase-config.js'
CONTENT_PATH = ROOT / 'data' / 'content.json'

TABLES = ['profile', 'experience', 'education', 'projects', 'skills', 'contact']
SINGLE = {'profile', 'contact'}


def load_config(path):
    text = path.read_text(encoding='utf-8')
    url = re.search(r"SUPABASE_URL:\s*'([^']+)'", text)
    key = re.search(r"SUPABASE_ANON_KEY:\s*'([^']+)'", text)
    if not url or not key:
        raise SystemExit('No se pudo leer SUPABASE_URL/SUPABASE_ANON_KEY de supabase-config.js')
    return url.group(1).rstrip('/'), key.group(1)


def fetch_rows(base_url, anon_key, table):
    url = base_url + '/rest/v1/' + table + '?select=*'
    request = urllib.request.Request(url, headers={
        'apikey': anon_key,
        'Authorization': 'Bearer ' + anon_key,
        'Accept': 'application/json',
    })
    with urllib.request.urlopen(request, timeout=30) as response:
        rows = json.loads(response.read().decode('utf-8'))
    if not rows:
        return []
    return rows[0] if table in SINGLE else rows


def main():
    base_url, anon_key = load_config(CONFIG_PATH)

    content = {}
    if CONTENT_PATH.exists():
        content = json.loads(CONTENT_PATH.read_text(encoding='utf-8'))

    for table in TABLES:
        content[table] = fetch_rows(base_url, anon_key, table)

    CONTENT_PATH.write_text(json.dumps(content, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('content.json actualizado con los datos de Supabase.')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('Error al sincronizar:', error, file=sys.stderr)
        sys.exit(1)
