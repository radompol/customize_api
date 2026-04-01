import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

let prismaInitError: Error | null = null;

export function getDb() {
  if (global.prisma) {
    return global.prisma;
  }

  try {
    const client = new PrismaClient();
    if (process.env.NODE_ENV !== "production") {
      global.prisma = client;
    }
    prismaInitError = null;
    return client;
  } catch (error) {
    prismaInitError = error instanceof Error ? error : new Error(String(error));
    throw prismaInitError;
  }
}

export function getDbSafely() {
  try {
    return getDb();
  } catch {
    return null;
  }
}

export function getDbInitError() {
  return prismaInitError;
}
