# Heart4 AI Gateway (Ollama บน VM)

รันบน **VM เท่านั้น** — ไม่ deploy ไป Vercel

เว็บแอป (Vercel) ใช้แค่ `KTIS_AI_GATEWAY_URL` + `KTIS_AI_GATEWAY_SECRET` เพื่อ proxy ไปเครื่องนี้

## สร้าง zip สำหรับ VM

จาก root โปรเจกต์:

```powershell
npm run pack:ai-gateway
```

ได้ `..\heart4-ai-gateway-pack.zip` (นอกโฟลเดอร์ repo)

## รันบน VM

```powershell
cd C:\heart4-ai\gateway
npm install
$env:HEART4_AI_SURVEYS_JSON="C:\heart4-ai\data\heart4rooms-surveys-decoded.json"
$env:OLLAMA_BASE_URL="http://127.0.0.1:11434"
$env:OLLAMA_MODEL="qwen2.5:7b"
$env:KTIS_AI_GATEWAY_SECRET="..."
npm start
```

## Vercel env

| ตัวแปร | ค่า |
|--------|-----|
| `KTIS_AI_GATEWAY_URL` | Cloudflare tunnel / public URL |
| `KTIS_AI_GATEWAY_SECRET` | ตรงกับ VM |
