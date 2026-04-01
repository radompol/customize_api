import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const DEFAULT_ALLOWED_ORIGINS = ["http://localhost:5173"];

function getAllowedOrigins() {
  const configured = process.env.ACCREDITATION_API_ALLOWED_ORIGINS;
  if (!configured) {
    return DEFAULT_ALLOWED_ORIGINS;
  }

  return configured
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function resolveAllowedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowedOrigins = getAllowedOrigins();

  if (!origin) {
    return null;
  }

  if (allowedOrigins.includes("*")) {
    return "*";
  }

  return allowedOrigins.includes(origin) ? origin : null;
}

function applyCorsHeaders(request: NextRequest, response: NextResponse) {
  const allowedOrigin = resolveAllowedOrigin(request);

  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.set("Access-Control-Max-Age", "86400");
  response.headers.set("Vary", "Origin");

  if (allowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  }

  return response;
}

export function middleware(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return applyCorsHeaders(request, new NextResponse(null, { status: 204 }));
  }

  return applyCorsHeaders(request, NextResponse.next());
}

export const config = {
  matcher: ["/api/:path*"]
};
