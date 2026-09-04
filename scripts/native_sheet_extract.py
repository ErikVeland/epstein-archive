"""Extract every worksheet, including hidden sheets, without changing the workbook."""

import json
from pathlib import Path
import sys

source, destination = sys.argv[1:]
sections = []
if Path(source).suffix.lower() == ".csv":
    import csv
    with open(source, encoding="utf-8-sig", errors="replace", newline="") as handle:
        sections.append({"name": Path(source).name, "visibility": "visible", "rows": list(csv.reader(handle))})
elif Path(source).suffix.lower() == ".xls":
    import xlrd
    book = xlrd.open_workbook(source)
    for sheet in book.sheets():
        sections.append({"name": sheet.name, "visibility": sheet.visibility,
            "rows": [sheet.row_values(index) for index in range(sheet.nrows)]})
else:
    import openpyxl
    book = openpyxl.load_workbook(source, read_only=True, data_only=False)
    for sheet in book:
        sections.append({"name": sheet.title, "visibility": sheet.sheet_state,
            "rows": [[str(value) if value is not None else "" for value in row]
                for row in sheet.iter_rows(values_only=True)]})
    book.close()
text = "\n\n".join("Worksheet: " + sheet["name"] + "\n" +
    "\n".join("\t".join(str(value) for value in row) for row in sheet["rows"]) for sheet in sections)
Path(destination).write_text(json.dumps({"text": text, "worksheets": sections, "segments": [],
    "method": "stored_values_or_formulas", "review_status": "unreviewed"}, ensure_ascii=False, indent=2))
