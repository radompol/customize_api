import { NextResponse } from "next/server";

const DEFAULT_ALLOWED_ORIGINS = ["http://localhost:5173"];
const DEFAULT_ALLOWED_HEADERS = ["Content-Type", "Authorization"];
const DEFAULT_ALLOWED_METHODS = ["GET", "POST", "PUT", "DELETE", "OPTIONS"];

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

export function resolveAllowedOrigin(request: Request) {
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

export function applyCorsHeaders(
  request: Request,
  response: NextResponse,
  methods: string[] = DEFAULT_ALLOWED_METHODS,
  headers: string[] = DEFAULT_ALLOWED_HEADERS
) {
  const allowedOrigin = resolveAllowedOrigin(request);

  response.headers.set("Access-Control-Allow-Methods", methods.join(", "));
  response.headers.set("Access-Control-Allow-Headers", headers.join(", "));
  response.headers.set("Access-Control-Max-Age", "86400");
  response.headers.set("Vary", "Origin");

  if (allowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  }

  return response;
}

export function createCorsPreflightResponse(
  request: Request,
  methods: string[] = DEFAULT_ALLOWED_METHODS,
  headers: string[] = DEFAULT_ALLOWED_HEADERS
) {
  return applyCorsHeaders(request, new NextResponse(null, { status: 204 }), methods, headers);
}
