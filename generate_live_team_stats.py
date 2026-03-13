import json
import re
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup

SOURCE_URL = "https://libertyleagueathletics.com/stats.aspx?path=baseball&year=2026"
OUTFILE = "live_team_stats.json"

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

def is_team_batting_table(headers):
  header_set = set(headers)

  if "team" not in header_set:
    return False

  # Must-have batting columns
  required = ["avg", "ab", "r", "h"]
  for req in required:
    if req not in header_set:
      return False

  # Strong batting indicators (helps avoid grabbing pitching/fielding)
  batting_plus = ["rbi", "ob%", "slg%"]
  plus_hits = 0
  for m in batting_plus:
    if m in header_set:
      plus_hits += 1
  if plus_hits < 2:
    return False

  # Reject pitching tables
  pitching_markers = ["era", "ip", "sho", "sv", "wp", "bk", "b/avg", "w-l"]
  for m in pitching_markers:
    if m in header_set:
      return False

  return True

def pick_team_batting_table(soup):
  for t in soup.find_all("table"):
    headers, rows = extract_table_rows(t)
    if not headers or not rows:
      continue
    if is_team_batting_table(headers):
      return headers, rows
  return None

def main():
  generated_at = datetime.now(timezone.utc).isoformat()
  mode_used = "requests"

  try:
    resp = requests.get(
      SOURCE_URL,
      timeout=30,
      headers={"User-Agent": "Mozilla/5.0 (compatible; liberty-league-stats-bot/1.0)"},
    )
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "lxml")
    picked = pick_team_batting_table(soup)

    if picked is None:
      payload = {
        "generated_at": generated_at,
        "source_url": SOURCE_URL,
        "mode": mode_used,
        "rows": [],
        "error": "Could not locate OVERALL team batting table (signature match failed)"
      }
    else:
      headers, rows = picked

      cleaned_rows = []
      for r in rows:
        r2 = dict(r)

        # Drop useless index column if present
        if "index" in r2 and (r2["index"] == "" or r2["index"] is None):
          del r2["index"]

        # Drop fielding columns so this stays strictly batting/offense
        fielding_keys = ["po", "a", "e", "fld%"]
        for fk in fielding_keys:
          if fk in r2:
            del r2[fk]

        cleaned_rows.append(r2)

      payload = {
        "generated_at": generated_at,
        "source_url": SOURCE_URL,
        "mode": mode_used,
        "rows": cleaned_rows,
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
