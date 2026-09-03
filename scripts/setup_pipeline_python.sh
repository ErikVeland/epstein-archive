#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")/.."

if python3 -m venv --clear .venv 2>/dev/null && .venv/bin/python -m pip --version >/dev/null 2>&1; then
  .venv/bin/python -m pip install --disable-pip-version-check -r requirements-pipeline.txt
else
  echo "Standard venv bootstrap is unavailable; using the verified non-root wheel fallback."
  python3 -m venv --without-pip --clear .venv
  python3 scripts/bootstrap_pipeline_python.py .venv/bin/python
fi

.venv/bin/python -c 'import pymupdf; print(f"PyMuPDF {pymupdf.__version__} ready")'
