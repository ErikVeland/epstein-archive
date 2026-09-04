"""Resume native-file extraction without changing source bytes or redactions."""

import argparse
import fcntl
import hashlib
import json
import math
import os
from pathlib import Path
import subprocess
import tempfile
import time


def finite_metrics(value):
    if isinstance(value, float) and not math.isfinite(value):
        return None
    if isinstance(value, dict):
        return {key: finite_metrics(item) for key, item in value.items()}
    if isinstance(value, list):
        return [finite_metrics(item) for item in value]
    return value


def save(path, value):
    normalized = finite_metrics(value)
    raw = json.dumps(value, ensure_ascii=False, indent=2)
    serialized = json.dumps(normalized, ensure_ascii=False, indent=2, allow_nan=False)
    if raw != serialized:
        # Retain invalid decoder metrics for audit. Evidence text stays unchanged.
        path.with_suffix(".raw-nonfinite.json").write_text(raw)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(serialized)
    temporary.replace(path)


def digest(path):
    h = hashlib.sha256()
    with open(path, "rb") as source:
        for block in iter(lambda: source.read(8 * 1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def command(args, timeout):
    result = subprocess.run(args, capture_output=True, timeout=timeout)
    if result.returncode:
        # Decoder output can include embedded evidence text. Keep it out of logs.
        raise RuntimeError(f"{Path(args[0]).name} exited {result.returncode}")
    return result.stdout


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--model", default="base")
    parser.add_argument("--backend", choices=["openai", "mlx"], default="openai")
    parser.add_argument("--mlx-model-path")
    parser.add_argument("--threads", type=int, default=4)
    parser.add_argument("--chunk-seconds", type=int, default=300)
    parser.add_argument("--sheet-python", required=True)
    args = parser.parse_args()
    output = Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    lock = open(output / "extract.lock", "w")
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    lock.write(str(os.getpid()))
    lock.flush()
    manifest = json.loads(Path(args.manifest).read_text())
    jobs = manifest["documents"]
    model = None
    model_identity = {}
    prepared = []
    for job in jobs:
        directory = output / job["document_id"]
        directory.mkdir(exist_ok=True)
        status_path = directory / "status.json"
        try:
            stamp = Path(job["path"]).stat()
            identity = [stamp.st_dev, stamp.st_ino, stamp.st_size, stamp.st_mtime_ns]
            probe_path = directory / "probe.json"
            cached = json.loads(probe_path.read_text()) if probe_path.exists() else {}
            if cached.get("identity") == identity and (not job["sha256"] or cached.get("sha256") == job["sha256"]):
                probe = cached
            else:
                sha = digest(job["path"])
                if job["sha256"] and job["sha256"] != sha:
                    raise RuntimeError("Source SHA-256 mismatch")
                probe = {"sha256": sha, "identity": identity, "size": stamp.st_size}
                if "spreadsheet" not in job["file_type"] and "excel" not in job["file_type"]:
                    probe.update(json.loads(command([
                        "/usr/local/bin/ffprobe", "-v", "error", "-show_entries",
                        "format=duration,format_name:stream=index,codec_type,codec_name,duration,width,height",
                        "-of", "json", job["path"]], 120)))
                save(probe_path, probe)
            job["sha256"] = probe["sha256"]
            if status_path.exists():
                status = json.loads(status_path.read_text())
                if status.get("sha256") == job["sha256"] and status.get("status") in ["succeeded", "not_applicable"]:
                    continue
            streams = probe.get("streams", [])
            duration = float(probe.get("format", {}).get("duration", 0) or 0)
            audio = next((s for s in streams if s.get("codec_type") == "audio"), None)
            is_sheet = "spreadsheet" in job["file_type"] or "excel" in job["file_type"]
            if not audio and not is_sheet:
                save(status_path, {"status": "not_applicable", "reason": "no_audio_stream",
                    "sha256": job["sha256"], "document_id": job["document_id"],
                    "updated_at": time.time(), "duration": duration})
                continue
            if audio and (duration <= 0 or not math.isfinite(duration)):
                duration = float(audio.get("duration", 0) or 0)
                if duration <= 0 or not math.isfinite(duration):
                    progress = command(["/usr/local/bin/ffmpeg", "-v", "error", "-nostdin",
                        "-i", job["path"], "-map", f"0:{audio['index']}", "-vn", "-ac", "1", "-ar", "16000",
                        "-progress", "pipe:1", "-f", "null", "-"], 1800).decode()
                    times = [int(line.split("=", 1)[1]) for line in progress.splitlines()
                        if line.startswith("out_time_us=") and line.split("=", 1)[1].lstrip("-").isdigit()]
                    duration = max(times, default=0) / 1000000
                    if duration <= 0:
                        raise RuntimeError("Unknown audio duration after decoding")
                    probe.setdefault("format", {})["duration"] = str(duration)
                    probe["duration_method"] = "ffmpeg_decoded_audio"
                    save(probe_path, probe)
            prepared.append((duration, job, directory, probe, audio, is_sheet))
            save(status_path, {"status": "queued", "sha256": job["sha256"],
                "document_id": job["document_id"], "duration": duration, "updated_at": time.time()})
        except Exception as error:
            save(status_path, {"status": "failed", "document_id": job["document_id"],
                "error_type": type(error).__name__, "error": str(error)[:160], "updated_at": time.time()})
    # Finish short recordings first. Long recordings resume at chunk boundaries.
    for duration, job, directory, probe, audio, is_sheet in sorted(prepared, key=lambda item: item[0]):
        status_path = directory / "status.json"
        started = time.time()
        common = {"document_id": job["document_id"], "sha256": job["sha256"], "duration": duration}
        try:
            if is_sheet:
                command([args.sheet_python, str(Path(__file__).with_name("native_sheet_extract.py")),
                    job["path"], str(directory / "transcript.json")], 600)
                tool = "spreadsheet-values-and-formulas-v1"
            else:
                if model is None:
                    if args.backend == "mlx":
                        if not args.mlx_model_path or not Path(args.mlx_model_path).is_dir():
                            raise RuntimeError("MLX requires a local, pinned model directory")
                        import mlx_whisper
                        model = mlx_whisper
                        from importlib.metadata import version
                        model_identity = {"backend": "mlx", "package_version": version("mlx-whisper"),
                            "weights_sha256": digest(Path(args.mlx_model_path) / "weights.npz"),
                            "config_sha256": digest(Path(args.mlx_model_path) / "config.json")}
                    else:
                        import torch
                        import whisper
                        torch.set_num_threads(args.threads)
                        model = whisper.load_model(args.model, device="cpu")
                        from importlib.metadata import version
                        model_identity = {"backend": "openai", "package_version": version("openai-whisper"),
                            "weights_sha256": digest(Path.home() / ".cache" / "whisper" / f"{args.model}.pt")}
                chunks = math.ceil(duration / args.chunk_seconds)
                all_segments = []
                texts = []
                for index in range(chunks):
                    offset = index * args.chunk_seconds
                    chunk_path = directory / f"chunk-{index:06d}.json"
                    save(status_path, {**common, "status": "running", "chunks_total": chunks,
                        "chunks_completed": index, "updated_at": time.time()})
                    if chunk_path.exists():
                        result = json.loads(chunk_path.read_text())
                        if result.get("source_sha256") != job["sha256"] or result.get("model") != args.model:
                            raise RuntimeError("Chunk provenance mismatch")
                    else:
                        with tempfile.TemporaryDirectory(prefix="native-asr-") as temporary:
                            wav = str(Path(temporary) / "audio.wav")
                            command(["/usr/local/bin/ffmpeg", "-v", "error", "-nostdin", "-ss", str(offset),
                                "-i", job["path"], "-t", str(min(args.chunk_seconds, duration - offset)),
                                "-map", f"0:{audio['index']}", "-vn", "-ac", "1", "-ar", "16000", "-y", wav], 600)
                            if args.backend == "mlx":
                                result = model.transcribe(wav, path_or_hf_repo=args.mlx_model_path,
                                    verbose=None, condition_on_previous_text=False)
                            else:
                                result = model.transcribe(wav, fp16=False, verbose=None, condition_on_previous_text=False)
                            result.update({"source_sha256": job["sha256"], "model": args.model,
                                "backend": args.backend, "model_path": args.mlx_model_path, "model_identity": model_identity,
                                "offset_seconds": offset, "machine_generated": True, "review_status": "unreviewed"})
                            save(chunk_path, result)
                    texts.append(result["text"].strip())
                    all_segments.extend({"start": s["start"] + offset, "end": s["end"] + offset,
                        "text": s["text"], "avg_logprob": s.get("avg_logprob"),
                        "no_speech_prob": s.get("no_speech_prob")} for s in result["segments"])
                save(directory / "transcript.json", {"text": "\n".join(texts).strip(), "segments": all_segments,
                    "source_sha256": job["sha256"], "model": args.model,
                    "backend": args.backend, "model_path": args.mlx_model_path, "model_identity": model_identity,
                    "machine_generated": True, "review_status": "unreviewed"})
                tool = f"{args.backend}-whisper-{args.model}"
            save(status_path, {**common, "status": "succeeded", "tool": tool,
                "artifact_sha256": digest(directory / "transcript.json"),
                "elapsed_seconds": time.time() - started, "updated_at": time.time()})
        except Exception as error:
            save(status_path, {**common, "status": "failed", "error_type": type(error).__name__,
                "error": str(error)[:160], "updated_at": time.time()})
    save(output / "extract-finished.json", {"updated_at": time.time(), "documents": len(jobs)})


if __name__ == "__main__":
    main()
