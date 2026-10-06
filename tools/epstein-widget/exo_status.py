#!/usr/bin/env python3
"""Check loaded EXO instances without treating its model catalog as live state."""

import datetime
import json
import os
import urllib.error
import urllib.request


def check_exo(base_url, opener=urllib.request.urlopen):
    result = {
        "reachable": False,
        "instanceAvailable": False,
        "modelLoaded": False,
        "status": "offline",
        "message": "EXO is not reachable",
        "checkedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "probes": [],
    }
    try:
        with opener(base_url + "/state", timeout=8) as response:
            state = json.load(response)
        result["reachable"] = True
        instances = state.get("instances")
        if not isinstance(instances, dict):
            result.update(status="unknown", message="EXO instance status is unavailable")
            return result
    except urllib.error.HTTPError as error:
        result.update(
            reachable=True,
            status="unknown",
            message=f"EXO instance status returned HTTP {error.code}",
        )
        return result
    except (OSError, ValueError):
        return result

    models = []
    for entry in instances.values():
        instance = entry if "shardAssignments" in entry else next(iter(entry.values()), {})
        model = instance.get("shardAssignments", {}).get("modelId")
        if isinstance(model, str) and model and model not in models:
            models.append(model)
    result["modelLoaded"] = bool(models)
    result["loadedModels"] = models
    if not models:
        result.update(status="no_instance", message="EXO is reachable but no model instance is loaded")
        return result

    def rank(model):
        for index, pattern in enumerate(("qwen3.5-2b", "qwen3-0.6b", "llama-3.2")):
            if pattern in model.lower():
                return index
        return 3

    timeout = max(1, float(os.environ.get("EXO_PROBE_TIMEOUT_SECONDS", "30")))
    for model in sorted(models, key=rank):
        request = urllib.request.Request(
            base_url + "/v1/chat/completions",
            data=json.dumps({
                "model": model,
                "messages": [{"role": "user", "content": "Reply OK"}],
                "max_tokens": 1,
                "temperature": 0,
                "enable_thinking": False,
            }).encode(),
            headers={"Content-Type": "application/json"},
        )
        try:
            with opener(request, timeout=timeout) as response:
                payload = json.load(response)
                status = response.status
            result["probes"].append({"model": model, "httpStatus": status})
            if status == 200 and payload.get("choices"):
                result.update(
                    instanceAvailable=True,
                    status="ready",
                    message=f"EXO instance callable ({model})",
                )
                return result
        except urllib.error.HTTPError as error:
            result["probes"].append({"model": model, "httpStatus": error.code})
        except (OSError, ValueError) as error:
            result["probes"].append({"model": model, "error": type(error).__name__})

    result.update(
        status="unresponsive",
        message="EXO has loaded models, but completion checks failed or timed out. Check model load and request queues.",
    )
    return result


if __name__ == "__main__":
    print(json.dumps(check_exo(os.environ.get("EXO_HOST", "http://127.0.0.1:52415").rstrip("/"))))
