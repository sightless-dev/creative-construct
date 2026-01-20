import {NextRequest, NextResponse} from "next/server";

const locales = ["ru", "en", "uk"] as const;
const defaultLocale = "ru";

function hasLocale(pathname: string) {
  return locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
}

export function middleware(req: NextRequest) {
  const {pathname} = req.nextUrl;

  // пропускаем next и статику
  if (pathname.startsWith("/_next") || pathname.includes(".")) return NextResponse.next();

  // если нет префикса языка — редиректим на /ru/...
  if (!hasLocale(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"]
};
