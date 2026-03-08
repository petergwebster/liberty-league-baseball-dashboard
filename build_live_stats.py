import json
import time
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup

# Optional fallback (workflow installs it, but keep code safe if import fails)
try:
    from playwright.sync_api import sync_playwright
    PLAYWRIGHT_AVAILABLE = True
except Exception:
    PLAYWRIGHT_AVAILABLE = False

SCOREBOARD_URL = "https://libertyleagueconference.com/sports/bsb/scoreboard"
OUTFILE = "live_team_stats.json"


def utc_now_iso():
    return datetime.now(timezone.utc).isoformat()


def fetch_with_requests(url, attempts=6, base_sleep=2):
    last_err = None
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; LibertyLeagueStatsBot/1.0)"
    }

    for attempt_idx in range(1, attempts + 1):
        try:
            resp = requests.get(url, headers=headers, timeout=30)
            resp.raise_for_status()
            return resp.text, None
        except Exception as e:
            last_err = str(e)
            time.sleep(base_sleep * attempt_idx)

    return None, "requests failed after " + str(attempts) + " attempts: " + str(last_err)


def fetch_with_playwright(url, attempts=3):
    if not PLAYWRIGHT_AVAILABLE:
        return None, "playwright not available"

    last_err = None
    for attempt_idx in range(1, attempts + 1):
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(
                    headless=True,
                    args=["--dns-result-order=ipv4first"]
                )
                page = browser.new_page()
                page.goto(url, wait_until="domcontentloaded", timeout=60000)
                html_text = page.content()
                browser.close()
                return html_text, None
        except Exception as e:
            last_err = str(e)
            time.sleep(2 * attempt_idx)

    return None, "playwright failed after " + str(attempts) + " attempts: " + str(last_err)


def parse_scoreboard_minimal(html_text):
    # Minimal parse so you can confirm fetch worked.
    # You can replace this later with your real table extraction.
    soup = BeautifulSoup(html_text, "lxml")

    title_text = soup.title.get_text(strip=True) if soup.title else ""
    links_count = len(soup.find_all("a"))
    tables_count = len(soup.find_all("table"))

    rows = [
        {"metric": "scrape_status", "value": "OK"},
        {"metric": "page_title", "value": title_text},
        {"metric": "links_count", "value": str(links_count)},
        {"metric": "tables_count", "value": str(tables_count)},
    ]
    return rows


def main():
    payload = {
        "generated_at": utc_now_iso(),
        "source_url": SCOREBOARD_URL,
        "rows": [],
        "error": None
    }

    html_text, err_req = fetch_with_requests(SCOREBOARD_URL)

    err_pw = None
    if html_text is None:
        html_text, err_pw = fetch_with_playwright(SCOREBOARD_URL)

    # OPTION A CORE CHANGE: if we still can't fetch, write non-empty rows anyway
    if html_text is None:
        payload["rows"] = [
            {"metric": "scrape_status", "value": "FAILED"},
            {"metric": "reason", "value": "Could not resolve or reach source host from GitHub Actions runner"},
            {"metric": "source_url", "value": SCOREBOARD_URL},
            {"metric": "note", "value": "Dashboard is healthy; upstream fetch failed. Try again later."},
        ]
        payload["error"] = "Requests error: " + str(err_req) + " | Playwright error: " + str(err_pw)
        with open(OUTFILE, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
        return

    # If we fetched HTML, parse it into rows (still guaranteed non-empty)
    try:
        payload["rows"] = parse_scoreboard_minimal(html_text)
    except Exception as e:
        payload["rows"] = [
            {"metric": "scrape_status", "value": "FAILED"},
            {"metric": "reason", "value": "Parse error"},
            {"metric": "details", "value": str(e)},
        ]
        payload["error"] = "Parse error: " + str(e)

    with open(OUTFILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


if __name__ == "__main__":
    main()
