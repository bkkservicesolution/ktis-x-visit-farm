import { NextResponse, type NextRequest } from "next/server";
import { KTISX_ROLE_COOKIE, type KtisxRole } from "@/lib/authConstants";

function getRole(req: NextRequest): KtisxRole | null {
  const v = req.cookies.get(KTISX_ROLE_COOKIE)?.value;
  if (v === "user" || v === "admin") return v;
  return null;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const role = getRole(req);

  const isForm = pathname.startsWith("/form");
  const isAdmin = pathname.startsWith("/admin");
  const isAdminDashboard = pathname.startsWith("/admin/dashboard");

  if (isForm && !role) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (isAdminDashboard && role !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Allow /admin to be accessible (it may just redirect to dashboard if admin)
  if (isAdmin && pathname === "/admin") {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/form/:path*", "/admin/:path*"],
};

