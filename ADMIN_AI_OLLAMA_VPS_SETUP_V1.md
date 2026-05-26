# Admin AI Ollama VPS Setup v1

This guide is for the current Heart4Rooms admin AI flow.

Goal:

- Keep the SQL-first analytics flow in the app.
- Add Ollama as the local LLM layer on the VPS.
- Keep Ollama private whenever possible.

Important:

- Your VPS details suggest a DirectAdmin / RHEL-family server (`CentOS`, `AlmaLinux`, or `Rocky Linux`) rather than Ubuntu.
- For a CPU-only VPS, start with a smaller Llama 3 model first for smoke testing.
- Do **not** expose port `11434` publicly unless you truly need remote access.

## Recommended rollout

1. Verify the server OS and resources.
2. Install Ollama on the VPS.
3. Pull a small Llama 3 model first.
4. Test Ollama locally on the server.
5. Point the app to Ollama with environment variables.
6. Only then consider a larger model.

## Step 1: SSH into the server

Use your SSH client and connect to the VPS over the SSH port provided by the host.

Once connected, run:

```bash
cat /etc/os-release
uname -m
free -h
df -h /
```

What to check:

- OS family
- CPU architecture (expect `x86_64`)
- Available RAM
- Free disk space

Rule of thumb:

- `llama3.2:3b` is a good bring-up choice on CPU-only servers
- `llama3.1:8b` is more realistic only when RAM and latency are acceptable

## Step 2: Install Ollama

On RHEL-family systems, install `zstd` first:

```bash
dnf update -y
dnf install -y curl zstd
curl -fsSL https://ollama.com/install.sh | sh
```

Check that the service exists:

```bash
systemctl status ollama --no-pager
ollama -v
```

Expected behavior:

- Ollama installs a system binary
- a systemd service is created
- CPU-only mode is normal on this VPS

## Step 3: Keep Ollama private

Default behavior is good:

- Ollama binds to `127.0.0.1:11434`
- that means only local processes on the same server can call it

This is the recommended setup if your Next.js app will run on the same VPS.

Do not open firewall rules for `11434` yet.

## Step 4: Pull a model

Start with this first:

```bash
ollama pull llama3.2:3b
```

Smoke test:

```bash
ollama run llama3.2:3b "ตอบแค่คำว่า พร้อม"
```

API smoke test:

```bash
curl http://127.0.0.1:11434/api/tags
```

```bash
curl http://127.0.0.1:11434/api/chat -H "Content-Type: application/json" -d '{
  "model": "llama3.2:3b",
  "stream": false,
  "messages": [
    { "role": "user", "content": "ตอบแค่คำว่า พร้อม" }
  ]
}'
```

If this works, Ollama is ready.

## Step 5: Optional service override

If you need custom environment variables for the systemd service, create a drop-in:

```bash
mkdir -p /etc/systemd/system/ollama.service.d
cat >/etc/systemd/system/ollama.service.d/override.conf <<'EOF'
[Service]
Environment="OLLAMA_HOST=127.0.0.1:11434"
EOF
systemctl daemon-reload
systemctl restart ollama
```

For this project, keeping `127.0.0.1` is preferred.

## Step 6: App-side environment variables

After the VPS side works, set these in the environment of the Next.js app:

```env
ADMIN_AI_BACKEND=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2:3b
```

What these do:

- `ADMIN_AI_BACKEND=ollama`: turn on Ollama-backed answer refinement
- `OLLAMA_BASE_URL`: where the server-side route calls Ollama
- `OLLAMA_MODEL`: the model name to use

## Step 7: Current app behavior after env is set

The app now supports this flow:

1. User asks a Thai question on `/admin/ai`
2. The app chooses a safe SQL template
3. The app queries Supabase through the guarded read-only tool
4. The app sends:
   - the question
   - the SQL used
   - the result rows
   - a draft answer
   to Ollama
5. Ollama rewrites the answer in Thai without changing the underlying evidence

This means:

- exact counts still come from SQL
- Ollama improves wording, not source-of-truth math

## Step 8: When to try a bigger model

Only after the 3B model works and latency is acceptable.

Then you can test:

```bash
ollama pull llama3.1:8b
```

And switch:

```env
OLLAMA_MODEL=llama3.1:8b
```

If the VPS is slow or RAM is tight, stay on `llama3.2:3b` for now.

## Security notes

- Do not expose `11434` publicly unless absolutely necessary.
- Prefer running the app and Ollama on the same VPS and calling `127.0.0.1`.
- Since server credentials were shared in chat, rotate them after setup.

## What to send back after Step 1

Send me the output of:

```bash
cat /etc/os-release
uname -m
free -h
df -h /
```

Then I can tell you whether to stay on `llama3.2:3b` first or jump to `llama3.1:8b`.
