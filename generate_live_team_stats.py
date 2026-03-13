import json
import re
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup

SOURCE_URL = "https://libertyleagueathletics.com/stats.aspx?path=baseball&year=2026"
OUTFILE = "live_team_stats.json"

print("SOURCE_URL=" + SOURCE_URL)


def norm_header(txt_val):
  return re.sub(r"\s+", " ", (txt_val or "").strip()).lower()


def extract_table_rows(table_el):
  header_cells = table_el.select("thead th")
  if not header_cells:
    header_cells = table_el.select("tr th")

  headers = [norm_header(th.get_text(" ", strip=True)) for th in header_cells]
  headers = [h for h in headers if h]

  body_rows = table_el.select("tbody tr")
  if not body_rows:
    all_rows = table_el.select("tr")
    body_rows = all_rows[1:] if len(all_rows) > 1 else []

  parsed_rows = []
  for tr in body_rows:
    tds = tr.find_all(["td", "th"])
    if not tds:
      continue

    row_obj = {}
    for i in range(min(len(headers), len(tds))):
      key = headers[i]
      val = tds[i].get_text(" ", strip=True)
      row_obj[key] = val

    if len(row_obj) > 0:
      parsed_rows.append(row_obj)

  return headers, parsed_rows


def pick_team_batting_table_from_soup(soup):
  tables = soup.find_all("table")
  best = None
  best_score = -10**9

  for t in tables:
    headers, rows = extract_table_rows(t)
    if not headers or not rows:
      continue

    header_set = set(headers)
    score = 0

    if any(h == "team" or h.startswith("team") for h in header_set):
      score += 10
    else:
      score -= 50

    batting_markers = [
      "avg", "g", "ab", "r", "h", "2b", "3b", "hr", "rbi",
      "tb", "slg%", "bb", "hbp", "so", "gdp", "ob%", "sf", "sh", "sb-att"
    ]
    for m in batting_markers:
      if m in header_set:
        score += 4

    pitching_markers = ["era", "ip", "sho", "sv", "wp", "bk", "b/avg", "w-l"]
    for m in pitching_markers:
      if m in header_set:
        score -= 6

    fielding_markers = ["fld%", "po", "a", "e", "dp", "pb", "ci"]
    for m in fielding_markers:
      if m in header_set:
        score -= 3

    if score > best_score:
      best_score = score
      best = (headers, rows)

  return best


def get_html_via_requests():
  resp = requests.get(
    SOURCE_URL,
    timeout=30,
    headers={
      "User-Agent": "Mozilla/5.0 (compatible; liberty-league-stats-bot/1.0)"
    },
  )
  resp.raise_for_status()
  return resp.text


def get_html_via_playwright():
  from playwright.sync_api import sync_playwright

  with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto(SOURCE_URL, wait_until="networkidle", timeout=60000)
    page.wait_for_timeout(2000)
    html = page.content()
    browser.close()

  return html


def main():
  generated_at = datetime.now(timezone.utc).isoformat()
  mode_used = "requests"
  html = ""
  soup = None

  try:
    html = get_html_via_requests()
    soup = BeautifulSoup(html, "lxml")
    picked = pick_team_batting_table_from_soup(soup)

    if not picked:
      mode_used = "playwright"
      html = get_html_via_playwright()
      soup = BeautifulSoup(html, "lxml")
      picked = pick_team_batting_table_from_soup(soup)

    if not picked:
      payload = {
        "generated_at": generated_at,
        "source_url": SOURCE_URL,
        "mode": mode_used,
        "rows": [],
        "error": "Could not locate OVERALL team batting table on page"
      }
    else:
      headers, rows = picked
      payload = {
        "generated_at": generated_at,
        "source_url": SOURCE_URL,
        "mode": mode_used,
        "rows": rows,
        "error": None
      }

  except Exception as exc:
    payload = {
      "generated_at": generated_at,
      "source_url": SOURCE_URL,
      "mode": mode_used,
      "rows": [],
      "error": str(exc)
    }

  with open(OUTFILE, "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
  main()
