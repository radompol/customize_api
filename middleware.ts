import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { applyCorsHeaders, createCorsPreflightResponse } from "@/lib/cors";

export function middleware(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return createCorsPreflightResponse(request);
  }

  return applyCorsHeaders(request, NextResponse.next());
}

export const config = {
  matcher: ["/api/:path*"]
};
