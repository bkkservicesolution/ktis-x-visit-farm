import { NextResponse } from "next/server";
import { KTISX_ROLE_COOKIE } from "@/lib/authConstants";

export async function POST(req: Request) {
  const url = new URL("/", req.url);
  const res = NextResponse.redirect(url, { status: 303 });
  res.cookies.set(KTISX_ROLE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

