import json
import os
import re
import sys
from datetime import datetime, timezone

from playwright.sync_api import sync_playwright


BASE_URL = "https://libertyleagueconference.com"
SCOREBOARD_URL = BASE_URL + "/sports/bsb/scoreboard"
STATS_GLOSSARY = [
    {"stat": "Team", "definition": "School name."},
    {"stat": "Record", "definition": "Overall W-L record shown on the site (if available)."},
    {"stat": "Conf", "definition": "Conference W-L record (if available)."},
    {"stat": "AVG", "definition": "Team batting average."},
    {"stat": "OBP", "definition": "On-base percentage."},
    {"stat": "SLG", "definition": "Slugging percentage."},
    {"stat": "OPS", "definition": "On-base plus slugging."},
    {"stat": "R", "definition": "Runs scored."},
    {"stat": "H", "definition": "Hits."},
    {"stat": "HR", "definition": "Home runs."},
    {"stat": "RBI", "definition": "Runs batted in."},
    {"stat": "SB", "definition": "Stolen bases."},
    {"stat": "ERA", "definition": "Earned run average."},
    {"stat": "WHIP", "definition": "Walks + hits per inning pitched."},
    {"stat": "K", "definition": "Strikeouts."},
]


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def safe_write_json(path, obj):
    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)
    os.replace(tmp_path, path)


def text_clean(s):
    if s is None:
        return ""
    return re.sub(r"\s+", " ", s).strip()


def try_float(val):
    if val is None:
        return None
    s = text_clean(str(val))
    s = s.replace("%", "")
    if s == "":
        return None
    try:
        return float(s)
    except Exception:
        return None


def extract_table(page, selector):
    table = page.query_selector(selector)
    if not table:
        return None

    headers = []
    ths = table.query_selector_all("thead tr th")
    for th in ths:
        headers.append(text_clean(th.inner_text()))

    rows = []
    trs = table.query_selector_all("tbody tr")
    for tr in trs:
        tds = tr.query_selector_all("td")
        if not tds:
            continue
        row = {}
        for idx, td in enumerate(tds):
            key = headers[idx] if idx < len(headers) and headers[idx] else "col_" + str(idx + 1)
            row[key] = text_clean(td.inner_text())
        rows.append(row)

    return {"headers": headers, "rows": rows}


def scrape_team_stats():
    """
    Best-effort scraper. If the site layout changes, we still emit JSON shells
    so the dashboard doesn't hard-crash.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_default_timeout(60000)

        page.goto(BASE_URL + "/sports/bsb/2025-26/teams", wait_until="domcontentloaded")
        page.wait_for_timeout(1500)

        # Heuristic: find the first reasonably large stats table on the page
        candidate_tables = page.query_selector_all("table")
        best = None
        for t in candidate_tables:
            ths = t.query_selector_all("thead tr th")
            trs = t.query_selector_all("tbody tr")
            if len(ths) >= 4 and len(trs) >= 5:
                best = t
                break

        team_payload = {"generated_at": now_iso(), "source_url": page.url, "rows": []}

        if best:
            headers = [text_clean(th.inner_text()) for th in best.query_selector_all("thead tr th")]
            for tr in best.query_selector_all("tbody tr"):
                tds = tr.query_selector_all("td")
                if not tds:
                    continue
                row = {}
                for idx, td in enumerate(tds):
                    key = headers[idx] if idx < len(headers) and headers[idx] else "col_" + str(idx + 1)
                    row[key] = text_clean(td.inner_text())
                team_payload["rows"].append(row)

        browser.close()
        return team_payload


def scrape_players_best_effort():
    """
    Many conference sites block or paginate player stats heavily.
    We emit an empty list if we can't find a player table.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_default_timeout(60000)

        # Try a common pattern for player stats pages
        candidate_urls = [
            BASE_URL + "/sports/bsb/2025-26/players",
            BASE_URL + "/sports/bsb/2025-26/stats",
        ]

        payload = {"generated_at": now_iso(), "source_url": None, "rows": []}

        for url in candidate_urls:
            try:
                page.goto(url, wait_until="domcontentloaded")
                page.wait_for_timeout(1500)
            except Exception:
                continue

            payload["source_url"] = page.url

            candidate_tables = page.query_selector_all("table")
            best = None
            for t in candidate_tables:
                ths = t.query_selector_all("thead tr th")
                trs = t.query_selector_all("tbody tr")
                if len(ths) >= 6 and len(trs) >= 10:
                    best = t
                    break

            if best:
                headers = [text_clean(th.inner_text()) for th in best.query_selector_all("thead tr th")]
                for tr in best.query_selector_all("tbody tr"):
                    tds = tr.query_selector_all("td")
                    if not tds:
                        continue
                    row = {}
                    for idx, td in enumerate(tds):
                        key = headers[idx] if idx < len(headers) and headers[idx] else "col_" + str(idx + 1)
                        row[key] = text_clean(td.inner_text())
                    payload["rows"].append(row)

                break

        browser.close()
        return payload


def main():
    team_stats = scrape_team_stats()
    players = scrape_players_best_effort()

    safe_write_json("live_team_stats.json", team_stats)
    safe_write_json("live_players.json", players)

    # Optional helper for the dashboard
    safe_write_json("stats_glossary.json", STATS_GLOSSARY)

    print("Wrote live_team_stats.json with " + str(len(team_stats.get("rows", []))) + " rows")
    print("Wrote live_players.json with " + str(len(players.get("rows", []))) + " rows")
    print("Wrote stats_glossary.json with " + str(len(STATS_GLOSSARY)) + " rows")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        # Fail loudly so GitHub Actions shows the error
        print(str(e))
        sys.exit(1)
