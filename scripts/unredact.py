"""Detect text concealed by PDF drawing overlays without modifying source evidence.

This scanner reports a recovery only when a later opaque vector rectangle covers an
earlier machine-readable text span. The derived PDF is a byte-for-byte source copy;
the JSON sidecar contains the auditable findings.
"""

import argparse
import csv
import glob
import json
import os
import shutil
import sys

import pymupdf as fitz


def _is_opaque_redaction_candidate(path, page_area):
    fill = path.get("fill")
    rect = path.get("rect")
    if fill is None or rect is None or path.get("fill_opacity", 1) < 0.95:
        return False
    is_black = all(channel <= 0.08 for channel in fill)
    is_white = all(channel >= 0.92 for channel in fill)
    if not (is_black or is_white):
        return False
    if rect.width < 8 or rect.height < 4 or rect.height > 120:
        return False
    if rect.get_area() > page_area * 0.25 or rect.width / max(rect.height, 1) < 1.25:
        return False
    return True


def _trace_text(trace):
    return "".join(chr(char[0]) for char in trace.get("chars", []) if char and char[0] > 0).strip()


def detect_overlay_text(page, page_number):
    findings = []
    seen = set()
    text_traces = page.get_texttrace()
    for drawing in page.get_drawings():
        if not _is_opaque_redaction_candidate(drawing, page.rect.get_area()):
            continue
        overlay_rect = fitz.Rect(drawing["rect"])
        overlay_seq = int(drawing.get("seqno", -1))
        for trace in text_traces:
            text_seq = int(trace.get("seqno", sys.maxsize))
            if overlay_seq <= text_seq:
                continue
            text = _trace_text(trace)
            if not text:
                continue
            text_rect = fitz.Rect(trace.get("bbox", (0, 0, 0, 0)))
            if text_rect.is_empty:
                continue
            intersection = overlay_rect & text_rect
            overlap = intersection.get_area() / max(text_rect.get_area(), 1)
            if overlap < 0.55:
                continue
            key = (text, tuple(round(value, 2) for value in text_rect))
            if key in seen:
                continue
            seen.add(key)
            findings.append(
                {
                    "kind": "overlay_text_exposed",
                    "page": page_number,
                    "text": text,
                    "bbox": list(text_rect),
                    "redaction_bbox": list(overlay_rect),
                    "confidence": round(min(0.99, 0.86 + overlap * 0.13), 3),
                    "evidence": [
                        "machine-readable text precedes opaque vector rectangle",
                        f"{overlap:.0%} of text bounds covered",
                    ],
                    "method": "pdf_object_order_v2",
                }
            )
    return findings


def process_file(file_path, output_folder, custom_name=None):
    base_name = os.path.basename(file_path)
    stem = os.path.splitext(base_name)[0]
    final_name = custom_name or f"{stem}_UNREDACTED.pdf"
    if not final_name.lower().endswith(".pdf"):
        final_name += ".pdf"
    os.makedirs(output_folder, exist_ok=True)

    payload = {"original_file": base_name, "scanner_version": "2", "spans": []}
    with fitz.open(file_path) as document:
        for page_index, page in enumerate(document):
            payload["spans"].extend(detect_overlay_text(page, page_index + 1))

    output_pdf = os.path.join(output_folder, final_name)
    shutil.copy2(file_path, output_pdf)
    json_path = os.path.join(output_folder, f"{os.path.splitext(final_name)[0]}.json")
    with open(json_path, "w", encoding="utf-8") as output:
        json.dump(payload, output, ensure_ascii=False, indent=2)
    print(f"[FORENSIC] {base_name}: {len(payload['spans'])} covered text spans")
    return [base_name, len(payload["spans"])]


def run_operation(input_path, output_folder, custom_name):
    files = [input_path] if os.path.isfile(input_path) else glob.glob(os.path.join(input_path, "*.pdf"))
    if not files:
        raise FileNotFoundError(f"No PDF input found: {input_path}")
    rows = [process_file(path, output_folder, custom_name if len(files) == 1 else None) for path in files]
    if rows:
        with open(os.path.join(output_folder, "summary_of_changes.csv"), "w", newline="", encoding="utf-8") as output:
            writer = csv.writer(output)
            writer.writerow(["Filename", "Overlay_Text_Findings"])
            writer.writerows(rows)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("-i", "--input", required=True)
    parser.add_argument("-o", "--output", required=True)
    parser.add_argument("-n", "--name")
    parser.add_argument("-b", "--bbox", type=int, default=1)
    parser.add_argument("--highlight", "--hl", type=int, default=0)
    args = parser.parse_args()
    run_operation(args.input, args.output, args.name)
