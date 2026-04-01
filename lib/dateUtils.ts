export function parseDateSafely(value: unknown): Date | null {
  if (value == null || value === "") {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function parseAcademicYearStart(acadYear: string) {
  const match = acadYear.match(/(\d{4})/);
  return match ? Number(match[1]) : 0;
}

export function normalizeSemesterLabel(semester: string) {
  return semester.trim();
}

export function getSemesterOrder(semester: string) {
  const normalized = semester.trim().toLowerCase();
  if (normalized.includes("1")) return 1;
  if (normalized.includes("2")) return 2;
  if (normalized.includes("3")) return 3;
  if (normalized.includes("summer")) return 3;
  return 9;
}

export function buildAcademicPeriodLabel(acadYear: string, semester: string) {
  return `${acadYear} ${normalizeSemesterLabel(semester)}`;
}

export function buildAcademicPeriodOrder(acadYear: string, semester: string) {
  return parseAcademicYearStart(acadYear) * 10 + getSemesterOrder(semester);
}

export function getNextAcademicPeriod(acadYear: string, semester: string) {
  const order = getSemesterOrder(semester);
  const yearMatch = acadYear.match(/(\d{4})\D+(\d{4})/);
  const startYear = yearMatch ? Number(yearMatch[1]) : parseAcademicYearStart(acadYear);
  const endYear = yearMatch ? Number(yearMatch[2]) : startYear + 1;

  if (order === 1) {
    return {
      acadYear,
      semester: "2nd",
      label: buildAcademicPeriodLabel(acadYear, "2nd")
    };
  }

  return {
    acadYear: `${endYear}-${endYear + 1}`,
    semester: "1st",
    label: buildAcademicPeriodLabel(`${endYear}-${endYear + 1}`, "1st")
  };
}
