import json
import re
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup

SOURCE_URL = "https://libertyleagueathletics.com/stats.aspx?path=baseball&year=2026"
OUTFILE = "live_team_stats.json"

def norm_header(txt):
  return re.sub(r"\s+", " ", (txt or "").strip()).lower()

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

  parsed = []
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
      parsed.append(row_obj)

  return headers, parsed

def pick_team_table(soup):
  tables = soup.find_all("table")
  best_table = None
  best_headers = None
  best_rows = None
  best_score = -1

  for t in tables:
    headers, rows = extract_table_rows(t)
    if not headers or not rows:
      continue

    header_set = set(headers)

    score = 0
    if any("team" == h or h.startswith("team") for h in header_set):
      score += 6
    if any("w-l" in h or h == "wl" for h in header_set):
      score += 4
    if any("pct" in h or "percentage" in h for h in header_set):
      score += 2
    if any("conf" in h or "conference" in h for h in header_set):
      score += 1

    if score > best_score:
      best_score = score
      best_table = t
      best_headers = headers
      best_rows = rows

  if best_table is None:
    return None

  return best_table, best_headers, best_rows

def parse_wl(text_val):
  m = re.search(r"(\d+)\s*[-/]\s*(\d+)", text_val or "")
  if not m:
    return None, None
  return int(m.group(1)), int(m.group(2))

def main():
  generated_at = datetime.now(timezone.utc).isoformat()

  try:
    resp = requests.get(SOURCE_URL, timeout=30)
    resp.raise_for_status()
    html = resp.text

    soup = BeautifulSoup(html, "html.parser")
    picked = pick_team_table(soup)

    if not picked:
      payload = {
        "generated_at": generated_at,
        "source_url": SOURCE_URL,
        "rows": [
          { "metric": "scrape_status", "value": "OK" },
          { "metric": "page_title", "value": soup.title.get_text(strip=True) if soup.title else "" },
          { "metric": "tables_count", "value": str(len(soup.find_all("table"))) },
          { "metric": "links_count", "value": str(len(soup.find_all("a"))) },
          { "metric": "html_text_len", "value": str(len(html)) },
          { "metric": "note", "value": "Could not identify team stats table in static HTML; page may be JS-rendered." }
        ],
        "error": None
      }
    else:
      table_el, headers, rows = picked

      normalized_rows = []
      for r in rows:
        team_name = ""
        for k in r.keys():
          if k == "team" or k.startswith("team"):
            team_name = r.get(k, "")
            break

        wl_text = ""
        for k in r.keys():
          if "w-l" in k or k == "wl":
            wl_text = r.get(k, "")
            break

        wins, losses = parse_wl(wl_text)

        out_row = { "team": team_name }
        out_row.update(r)
        if wins is not None:
          out_row["wins"] = wins
        if losses is not None:
          out_row["losses"] = losses

        normalized_rows.append(out_row)

      payload = {
        "generated_at": generated_at,
        "source_url": SOURCE_URL,
        "rows": normalized_rows,
        "error": None
      }

  except Exception as e:
    payload = {
      "generated_at": generated_at,
      "source_url": SOURCE_URL,
      "rows": [],
      "error": str(e)
    }

  with open(OUTFILE, "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
  main()
