import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

function toDataUrlPng(bytes: Buffer): string {
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

export default async function AppleIcon() {
  const filePath = path.join(process.cwd(), "public", "brand", "logo.png");
  const bytes = await readFile(filePath);
  const dataUrl = toDataUrlPng(bytes as Buffer);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dataUrl}
          width={180}
          height={180}
          alt="KTIS X VISIT FARM"
          style={{ borderRadius: 36 }}
        />
      </div>
    ),
    { ...size },
  );
}

