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
  const isHome = pathname === "/home" || pathname.startsWith("/home/");
  const isSurveys = pathname.startsWith("/surveys");
  const isAdmin = pathname.startsWith("/admin");
  const isAdminRoot = pathname === "/admin";

  if ((isHome || isSurveys) && !role) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (isForm && !role) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // All admin pages require admin role.
  // Keep /admin accessible (it may redirect client-side).
  if (isAdmin && !isAdminRoot && role !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Allow /admin to be accessible (it may just redirect to dashboard if admin)
  if (isAdmin && isAdminRoot) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/home", "/home/:path*", "/surveys/:path*", "/form/:path*", "/admin/:path*"],
};

