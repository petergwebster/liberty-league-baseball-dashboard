import json
import time
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup

try:
    from playwright.sync_api import sync_playwright
    PLAYWRIGHT_AVAILABLE = True
except Exception:
    PLAYWRIGHT_AVAILABLE = False

STATS_URL = "https://libertyleagueathletics.com/stats.aspx?path=baseball&year=2026"
OUTFILE = "live_team_stats.json"

def utc_now_iso():
    return datetime.now(timezone.utc).isoformat()

def fetch_with_requests(url, attempts=6, base_sleep=2):
    last_err = None
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; LibertyLeagueStatsBot/1.0)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Connection": "keep-alive",
    }

    for attempt_idx in range(1, attempts + 1):
        try:
            resp = requests.get(url, headers=headers, timeout=45)
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
                page.goto(url, wait_until="domcontentloaded", timeout=90000)
                page.wait_for_timeout(2000)
                html_text = page.content()
                browser.close()
                return html_text, None
        except Exception as e:
            last_err = str(e)
            time.sleep(2 * attempt_idx)

    return None, "playwright failed after " + str(attempts) + " attempts: " + str(last_err)

def parse_stats_page_minimal(html_text):
    soup = BeautifulSoup(html_text, "lxml")

    title_text = soup.title.get_text(strip=True) if soup.title else ""
    tables_count = len(soup.find_all("table"))
    links_count = len(soup.find_all("a"))

    body_text = soup.get_text(" ", strip=True)
    body_len = len(body_text)

    rows = [
        {"metric": "scrape_status", "value": "OK"},
        {"metric": "page_title", "value": title_text},
        {"metric": "tables_count", "value": str(tables_count)},
        {"metric": "links_count", "value": str(links_count)},
        {"metric": "html_text_len", "value": str(body_len)},
        {"metric": "source_url", "value": STATS_URL},
    ]
    return rows

def main():
    payload = {
        "generated_at": utc_now_iso(),
        "source_url": STATS_URL,
        "rows": [],
        "error": None
    }

    html_text, err_req = fetch_with_requests(STATS_URL)

    err_pw = None
    if html_text is None:
        html_text, err_pw = fetch_with_playwright(STATS_URL)

    if html_text is None:
        payload["rows"] = [
            {"metric": "scrape_status", "value": "FAILED"},
            {"metric": "reason", "value": "Could not fetch stats page from GitHub Actions runner"},
            {"metric": "source_url", "value": STATS_URL},
            {"metric": "note", "value": "Dashboard is healthy; upstream fetch failed. Try again later."},
        ]
        payload["error"] = "Requests error: " + str(err_req) + " | Playwright error: " + str(err_pw)
        with open(OUTFILE, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
        return

    try:
        payload["rows"] = parse_stats_page_minimal(html_text)
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
