import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

function toDataUrlPng(bytes: Buffer): string {
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

export default async function Icon() {
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
          width={32}
          height={32}
          alt="KTIS X VISIT FARM"
          style={{ borderRadius: 8 }}
        />
      </div>
    ),
    { ...size },
  );
}

