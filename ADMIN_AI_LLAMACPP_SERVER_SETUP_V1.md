# Admin AI llama.cpp Server Setup v1

This guide is for the current production shape:

- web app on Vercel
- SQL-first analytics inside the Next.js app
- local self-hosted LLM running on your separate AI server

This guide assumes you already:

- built `llama.cpp`
- downloaded `Llama-3.2-3B-Instruct-Q4_K_M.gguf`
- verified `curl http://127.0.0.1:8080/health` works
- verified `POST /v1/chat/completions` returns a valid answer

## Recommended architecture

1. Vercel app receives the admin question
2. The app chooses a safe SQL template and queries Supabase
3. The app sends:
   - the original question
   - a draft answer
   - SQL used
   - evidence rows
   to the llama.cpp server
4. llama.cpp rewrites the answer in Thai
5. exact counts still come from SQL, not from the model

## Current app support

The app now supports `llama.cpp` directly with these env vars:

```env
ADMIN_AI_BACKEND=llama_cpp
LLAMA_CPP_BASE_URL=http://YOUR_SERVER_IP:8080
LLAMA_CPP_MODEL=local-model
LLAMA_CPP_API_KEY=replace_with_long_random_secret
```

Notes:

- `LLAMA_CPP_MODEL` is only the request-side model label. `llama.cpp` usually ignores it when one model is loaded.
- The real model name returned by the server will still appear in responses.

## Step 1: Run llama-server with an API key

On the AI server, generate a long random key:

```bash
openssl rand -hex 32
```

Start the server like this:

```bash
source /opt/rh/devtoolset-11/enable
cd /root/llama.cpp
./build/bin/llama-server \
  -m /root/models/Llama-3.2-3B-Instruct-Q4_K_M.gguf \
  --host 0.0.0.0 \
  --port 8080 \
  --threads 8 \
  -c 2048 \
  --api-key YOUR_LONG_RANDOM_KEY
```

Why `0.0.0.0` now?

- because Vercel must call this server over the network
- `127.0.0.1` only allows local calls from the same machine

## Step 2: Test remote API auth locally on the server

From the server itself:

```bash
curl http://127.0.0.1:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_LONG_RANDOM_KEY" \
  -d '{
    "model": "local-model",
    "messages": [
      { "role": "user", "content": "ตอบแค่คำว่า พร้อม" }
    ]
  }'
```

Expected:

- HTTP 200
- JSON response with assistant content

## Step 3: Test from your own machine

From your computer, try:

```bash
curl http://YOUR_SERVER_IP:8080/health
```

Then:

```bash
curl http://YOUR_SERVER_IP:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_LONG_RANDOM_KEY" \
  -d '{
    "model": "local-model",
    "messages": [
      { "role": "user", "content": "ตอบแค่คำว่า พร้อม" }
    ]
  }'
```

If the remote call fails:

- check provider firewall / security policy
- check whether the VPS provider blocks public ports
- check whether `llama-server` is really bound to `0.0.0.0`

## Step 4: Set Vercel environment variables

In Vercel project env vars, set:

```env
ADMIN_AI_BACKEND=llama_cpp
LLAMA_CPP_BASE_URL=http://YOUR_SERVER_IP:8080
LLAMA_CPP_MODEL=local-model
LLAMA_CPP_API_KEY=YOUR_LONG_RANDOM_KEY
```

After redeploying or refreshing env:

- `/admin/ai` will keep using SQL as source-of-truth
- the final wording will be refined by `llama.cpp`

## Step 5: Quick smoke test from the app

Ask one of these:

- `มีคนไม่เคยได้ยินเรื่องหัวใจ 4 ห้องกี่คน`
- `สรุปคำตอบข้อ 1 ให้หน่อย`
- `มีกี่รายที่กังวลเรื่องราคาอ้อย`

On success, the chat response should show:

- `LLM backend: llama_cpp`
- the loaded model name returned by the server

## Important security notes

This setup is enough for bring-up, but it is not ideal long-term if exposed as plain HTTP.

Recommended hardening later:

1. Put `nginx` in front with HTTPS
2. Keep the bearer API key
3. Optionally move the server to a non-default internal port and expose only nginx
4. Add request rate limiting if needed

## If you want the server to survive logout

Foreground mode is fine for testing, but for normal use create a service later.

For now, a simple background approach:

```bash
source /opt/rh/devtoolset-11/enable
cd /root/llama.cpp
nohup ./build/bin/llama-server \
  -m /root/models/Llama-3.2-3B-Instruct-Q4_K_M.gguf \
  --host 0.0.0.0 \
  --port 8080 \
  --threads 8 \
  -c 2048 \
  --api-key YOUR_LONG_RANDOM_KEY \
  >/root/llama-server.log 2>&1 &
```

Check:

```bash
ps -ef | grep llama-server
tail -n 50 /root/llama-server.log
```

## Recommended next step

Do the smallest working production path first:

1. start `llama-server` on `0.0.0.0`
2. protect it with `--api-key`
3. set Vercel env vars
4. test `/admin/ai`

Only after that should you decide whether to add nginx + HTTPS.
