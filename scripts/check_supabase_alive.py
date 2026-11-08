#!/usr/bin/env python3
"""Read-only OHANA Street PostgreSQL heartbeat via Supabase's public API.

Reads the existing browser-safe publishable key from gestione/config.js.
No service-role credentials, customer data, or supplier links are used.
"""
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path


CONFIG_PATH = Path(__file__).resolve().parents[1] / "gestione" / "config.js"
EXPECTED_URL = "https://tqkmrejfbvzchfplgxzl.supabase.co"


def public_config_value(content: str, field: str) -> str:
    match = re.search(r"\b" + re.escape(field) + r"\s*:\s*(['\"])([^'\"\r\n]+)\1", content)
    if not match:
        raise ValueError(f"Campo pubblico {field} mancante nella configurazione")
    return match.group(2)


def main() -> int:
    try:
        config = CONFIG_PATH.read_text(encoding="utf-8")
        url = public_config_value(config, "supabaseUrl")
        key = public_config_value(config, "supabaseAnonKey")
        if url != EXPECTED_URL or not key.startswith("sb_publishable_"):
            raise ValueError("Configurazione Supabase inattesa: interrompo il controllo")

        request = urllib.request.Request(
            url + "/rest/v1/rpc/ohana_heartbeat",
            data=b"{}",
            method="POST",
            headers={
                "apikey": key,
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "ohana-street-heartbeat/1.0",
            },
        )
        with urllib.request.urlopen(request, timeout=25) as response:
            body = response.read(128)
            if response.status != 200 or json.loads(body) is not True:
                raise ValueError("Risposta heartbeat PostgreSQL inattesa")
        print("OK: query PostgreSQL Supabase completata con esito positivo")
        return 0
    except urllib.error.HTTPError as exc:
        print(f"ERRORE: Supabase ha risposto HTTP {exc.code}", file=sys.stderr)
    except (OSError, ValueError, json.JSONDecodeError, urllib.error.URLError) as exc:
        print(f"ERRORE: controllo Supabase fallito ({type(exc).__name__})", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
