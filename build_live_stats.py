import json
import os
from datetime import datetime, timezone

from playwright.sync_api import sync_playwright

BASE_URL = "https://libertyleagueconference.com"
SCOREBOARD_URL = BASE_URL + "/sports/bsb/scoreboard"

def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")

def safe_write_json(path, obj):
    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)
    os.replace(tmp_path, path)

def ensure_files_exist():
    if not os.path.exists("live_team_stats.json"):
        safe_write_json("live_team_stats.json", {"generated_at": "", "source_url": "", "rows": []})
    if not os.path.exists("live_players.json"):
        safe_write_json("live_players.json", {"generated_at": "", "source_url": "", "rows": []})
    if not os.path.exists("stats_glossary.json"):
        safe_write_json("stats_glossary.json", [])

def scrape_best_effort(url):
    payload = {"generated_at": now_iso(), "source_url": url, "rows": []}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_default_timeout(45000)

        try:
            page.goto(url, wait_until="domcontentloaded")
            page.wait_for_timeout(1200)

            tables = page.query_selector_all("table")
            if len(tables) == 0:
                browser.close()
                return payload

            table = tables[0]
            headers = [th.inner_text().strip() for th in table.query_selector_all("thead tr th")]
            if len(headers) == 0:
                headers = [th.inner_text().strip() for th in table.query_selector_all("tr th")]

            trs = table.query_selector_all("tbody tr")
            if len(trs) == 0:
                trs = table.query_selector_all("tr")

            rows = []
            for tr in trs:
                tds = tr.query_selector_all("td")
                if len(tds) == 0:
                    continue
                row = {}
                for idx, td in enumerate(tds):
                    key = headers[idx] if idx < len(headers) and headers[idx] else "col_" + str(idx + 1)
                    row[key] = " ".join(td.inner_text().split()).strip()
                rows.append(row)

            payload["rows"] = rows
            browser.close()
            return payload

        except Exception as e:
            # Critical change: do NOT fail the workflow on DNS / site issues.
            payload["error"] = str(e)
            browser.close()
            return payload

def main():
    ensure_files_exist()

    team_stats = scrape_best_effort(SCOREBOARD_URL)

    # Player scraping can be added later; keep it stable for now
    players = {"generated_at": now_iso(), "source_url": "", "rows": []}

    safe_write_json("live_team_stats.json", team_stats)
    safe_write_json("live_players.json", players)

    print("Done. team rows " + str(len(team_stats.get("rows", []))))

if __name__ == "__main__":
    main()
