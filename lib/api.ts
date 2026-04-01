import { NextResponse } from "next/server";

export function apiSuccess<T>(payload: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, ...payload }, init);
}

export function apiError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ success: false, error: message, details }, { status });
}
