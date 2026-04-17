## KTIS X VISIT FARM

Web app สำหรับกรอกและจัดเก็บข้อมูล “แบบฟอร์มประเมินศักยภาพไร่อ้อย (Onsite Visit Form)” ด้วย Next.js + Supabase และ Deploy บน Vercel

## Getting Started

### 1) Setup Supabase

- สร้างโปรเจกต์ใน Supabase
- สร้างตารางโดยรันไฟล์ `supabase/schema.sql` ใน SQL Editor

### 2) Configure environment variables

สร้างไฟล์ `.env.local` (มีตัวอย่างให้ใน `.env.example`) แล้วเติมค่าต่อไปนี้:

```env
SUPABASE_URL=https://xdqvlohtoruprvryuziz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...           # server-only ห้ามเผยแพร่

KTISX_FORM_CODE_HASH=...                # SHA-256 (hex) ของ ktisx2026
KTISX_ADMIN_CODE_HASH=...               # SHA-256 (hex) ของ ktisxadmin2026
```

### 3) Run development server

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open `http://localhost:3000` with your browser to see the result.

### Routes

- `/` หน้า login (รหัสเดียว กำหนด role)
- `/form` หน้าแบบฟอร์ม (user/admin)
- `/admin/dashboard` หน้าดูข้อมูล (admin เท่านั้น)

### Notes

- `.env.local` ถูก ignore โดย git อยู่แล้ว (อย่า commit secret)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
