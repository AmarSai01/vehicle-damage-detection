# Windows Setup Guide

## Python version requirement (important)

This project uses **TensorFlow**. Official TensorFlow wheels typically target **Python 3.10–3.12**.

On this machine, launcher detection may show only newer runtimes (for example **3.13** or **3.14**). Python **3.14** is especially likely to break or block TensorFlow installs.

### Recommended

1. Install **Python 3.12** (64-bit) from https://www.python.org/downloads/
2. Ensure “Add python.exe to PATH” is checked, or use the `py` launcher
3. Recreate the venv with 3.12:

```powershell
cd "C:\path\to\Vehicle damage Detection"
Remove-Item -Recurse -Force .venv -ErrorAction SilentlyContinue
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip certifi
pip install -r requirements.txt
```

If `py -3.12` is unavailable, install 3.12 first, then re-run the steps above.

### If you must use Python 3.13

- Core API/frontend deps (FastAPI, pytest, Pillow, etc.) usually install fine.
- Install TensorFlow with a **newer** pin than older docs may show, for example:

```powershell
pip install "tensorflow>=2.20"
```

Then update `requirements.txt` so the TensorFlow line matches what actually installs on your Python version.

### If TensorFlow will not install

Training, model-build unit tests, and dual-model inference will not run until TensorFlow is installed on a supported Python version. The FastAPI health endpoints and “models not available” paths still work without trained `.keras` artifacts.

## Node.js / frontend

```powershell
cd frontend
npm install
npm install -D vitest
npm run build
npm test
```

## Backend smoke check

From the project root with the venv active:

```powershell
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

In another terminal:

```powershell
curl http://127.0.0.1:8000/api/health
```

## Dataset (CarDD)

Do **not** download CarDD through this repo. Obtain authorized access via https://cardd-ustc.github.io/ — see `docs/DATASET_ACCESS.md`.

After extracting locally:

```powershell
copy .env.example .env
# Edit DATASET_ROOT=...
python scripts/inspect_dataset.py
```

## Common Windows issues

| Issue | Fix |
|-------|-----|
| `pip` TLS / `cacert.pem` errors | `pip install --upgrade pip certifi` then set `SSL_CERT_FILE` to `python -c "import certifi; print(certifi.where())"` |
| WinError 32 during pip install | Close other Python/pip processes; retry; briefly pause antivirus scanning of `.venv` |
| Git under `frontend/` | Git must live at the **project root** only — delete `frontend/.git` if it appears |
| PowerShell activation blocked | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
