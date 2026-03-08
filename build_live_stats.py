import json
import time
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup

# Optional fallback
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
        "User-Agent": "Mozilla/5.0 (compatible; LibertyLeagueStatsBot/1.0; +https://libertyleaguestats.netlify.app)"
    }

    for attempt_idx in range(1, attempts + 1):
        try:
            resp = requests.get(url, headers=headers, timeout=30)
            resp.raise_for_status()
            return resp.text, None
        except Exception as e:
            last_err = str(e)
            sleep_s = base_sleep * attempt_idx
            time.sleep(sleep_s)

    return None, "requests failed after " + str(attempts) + " attempts: " + str(last_err)


def fetch_with_playwright(url, attempts=3):
    if not PLAYWRIGHT_AVAILABLE:
        return None, "playwright not available in environment"

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
                html = page.content()
                browser.close()
                return html, None
        except Exception as e:
            last_err = str(e)
            time.sleep(3 * attempt_idx)

    return None, "playwright failed after " + str(attempts) + " attempts: " + str(last_err)


def parse_scoreboard_minimal(html_text):
    # NOTE: This is deliberately conservative.
    # It just proves we can fetch and parse something stable.
    # You can expand this later to match your exact table extraction logic.
    soup = BeautifulSoup(html_text, "lxml")

    title = soup.title.get_text(strip=True) if soup.title else ""
    links_count = len(soup.find_all("a"))
    tables_count = len(soup.find_all("table"))

    # Placeholder "rows" structure so your dashboard can show something
    # even before we implement the full stats extraction.
    rows = [
        {"metric": "page_title", "value": title},
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

    html_text, err = fetch_with_requests(SCOREBOARD_URL)
    if err is not None:
        html_text, err2 = fetch_with_playwright(SCOREBOARD_URL)
        if err2 is not None:
            payload["error"] = "Requests error: " + str(err) + " | Playwright error: " + str(err2)
            with open(OUTFILE, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2)
            return

    try:
        rows = parse_scoreboard_minimal(html_text)
        payload["rows"] = rows
    except Exception as e:
        payload["error"] = "Parse error: " + str(e)

    with open(OUTFILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


if __name__ == "__main__":
    main()
