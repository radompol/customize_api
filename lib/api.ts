import { NextResponse } from "next/server";
import { applyCorsHeaders } from "@/lib/cors";

export function apiSuccess<T>(payload: T, init?: ResponseInit, request?: Request) {
  const response = NextResponse.json({ success: true, ...payload }, init);
  return request ? applyCorsHeaders(request, response) : response;
}

export function apiError(message: string, status = 400, details?: unknown, request?: Request) {
  const response = NextResponse.json({ success: false, error: message, details }, { status });
  return request ? applyCorsHeaders(request, response) : response;
}
