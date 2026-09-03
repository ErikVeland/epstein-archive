#!/usr/bin/env python3
"""Install the pinned PyMuPDF wheel when the host cannot create a pip-enabled venv."""

from __future__ import annotations

import hashlib
import subprocess
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path

PYMUPDF_VERSION = "1.26.4"
LINUX_X86_64_WHEEL = (
    "https://files.pythonhosted.org/packages/4e/c6/"
    "d3cfafc75d383603884edeabe4821a549345df954a88d79e6764e2c87601/"
    "pymupdf-1.26.4-cp39-abi3-manylinux_2_28_x86_64.whl"
)
LINUX_X86_64_SHA256 = "973a6dda61ebd34040e4df3753bf004b669017663fbbfdaa294d44eceba98de0"


def run(target_python: Path, code: str) -> str:
    return subprocess.check_output([str(target_python), "-c", code], text=True).strip()


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: bootstrap_pipeline_python.py <venv-python>")

    # Keep the venv entry-point path. Resolving its symlink would make Python
    # calculate system-level installation paths instead of the isolated venv.
    target_python = Path(sys.argv[1]).absolute()
    if not target_python.exists():
        raise SystemExit(f"target interpreter does not exist: {target_python}")

    target_platform = run(
        target_python,
        "import platform; print(platform.system().lower() + ':' + platform.machine().lower())",
    )
    target_version = run(target_python, "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
    if target_platform != "linux:x86_64" or tuple(map(int, target_version.split("."))) < (3, 9):
        raise SystemExit(
            "pip-free bootstrap supports Linux x86_64 with Python 3.9+ only; "
            f"found {target_platform} Python {target_version}"
        )

    purelib = Path(
        run(target_python, "import sysconfig; print(sysconfig.get_paths()['purelib'])")
    )
    purelib.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="pipeline-python-") as temp_dir:
        wheel = Path(temp_dir) / f"pymupdf-{PYMUPDF_VERSION}.whl"
        urllib.request.urlretrieve(LINUX_X86_64_WHEEL, wheel)
        digest = hashlib.sha256(wheel.read_bytes()).hexdigest()
        if digest != LINUX_X86_64_SHA256:
            raise SystemExit(
                f"PyMuPDF wheel integrity check failed: expected {LINUX_X86_64_SHA256}, got {digest}"
            )
        with zipfile.ZipFile(wheel) as archive:
            archive.extractall(purelib)

    installed_version = run(target_python, "import pymupdf; print(pymupdf.__version__)")
    if installed_version != PYMUPDF_VERSION:
        raise SystemExit(
            f"unexpected PyMuPDF version: expected {PYMUPDF_VERSION}, got {installed_version}"
        )
    print(f"Installed PyMuPDF {installed_version} into {purelib}")


if __name__ == "__main__":
    main()
