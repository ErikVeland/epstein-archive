# Native DOJ corpus processing

Keep source originals on the archive volume. The native worker verifies SHA-256, probes containers, and writes raw, unreviewed transcripts in resumable five-minute chunks. It extracts spreadsheet values and available formulas, including hidden worksheets. It does not alter source bytes or redactions.

Use a version 1 selection manifest with a stable `run_id`, `max_server_file_bytes`, and a `documents` array. Each document has `document_id`, `path`, `size`, `sha256`, `file_type`, and `sources`. Each source has its EFTA `id`, official `url`, local `path`, `filename`, and a `verified` boolean backed by the acquisition audit. A filename match alone does not establish source verification.

Start the extractor with a Python environment that has OpenAI Whisper and PyTorch. The sheet Python environment needs openpyxl and xlrd. FFmpeg and ffprobe are read from `/usr/local/bin`.

```bash
python scripts/native_corpus_extract.py --manifest "$NATIVE_MANIFEST" --output "$NATIVE_OUTPUT" --sheet-python "$SHEET_PYTHON"
```

Run the catalogue importer alongside it from the repository root. The importer uses the local ingest pool, preserves canonical text, and rejects a conflicting transcript. Its advisory lock prevents duplicate import workers for the same run.

```bash
node --import tsx/esm scripts/native_corpus_pipeline.ts --manifest "$NATIVE_MANIFEST" --output "$NATIVE_OUTPUT"
```

On Apple silicon, an ARM Python environment with `mlx-whisper` can use `--backend mlx --mlx-model-path "$MLX_MODEL_PATH"`. Supply a pinned, local model directory containing `weights.npz` and `config.json`. The worker records model file hashes and the runtime version in raw chunk artifacts.

Read `pipeline-status.json` in the output directory for scoped counts. `succeeded` means extraction ran. `not_applicable` means there is no audio stream. A silent transcript is not proof of missing evidence. Failed files retain a failure state and resume on another extractor run. The existing backfill pipeline picks up extracted text for downstream analysis. Extraction completion does not mean that summaries, entities, graph extraction, or review are complete.

## Server promotion

The first native release uses a 25 MiB per-file limit. Larger originals remain local and use explicit DOJ links on the server. Browsers may need to open the DOJ site directly to satisfy its normal access flow. No server proxy cache is required.

After the release version, notes, commit, and quality gates are ready, export a native bundle:

```bash
pnpm media:release:export --native --manifest "$NATIVE_MANIFEST" --bundle "$NATIVE_BUNDLE" --release-version "$RELEASE_VERSION"
```

Exported asset entries are local symlinks. Transfer the bundle with symlink dereferencing, such as `rsync -L`, into `.media-releases/native/<version>` on the server. Check free disk space first. Keep at least 8 GiB free after staging. Do not delete unrelated files to make room.

From the server repository, run the importer and verifier against that bundle:

```bash
pnpm media:release:import --native --bundle "$NATIVE_BUNDLE" --dry-run
pnpm media:release:import --native --bundle "$NATIVE_BUNDLE" --apply
pnpm media:release:verify --native --bundle "$NATIVE_BUNDLE"
```

Promotion matches document bytes by SHA-256, maps local IDs to server IDs, and rejects text or media identity conflicts. It hard-links staged assets into their active paths on the same filesystem. Keep the verified bundle and receipt for later checks. The ordinary image media bundle remains separate.

Each bundle is a snapshot of available results. Later transcripts require another verified promotion. A code deployment alone does not synchronize those results.
