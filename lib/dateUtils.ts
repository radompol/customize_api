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

function parseAcademicYearBounds(acadYear: string) {
  const match = acadYear.match(/(\d{4})\D+(\d{4})/);
  const startYear = match ? Number(match[1]) : parseAcademicYearStart(acadYear);
  const endYear = match ? Number(match[2]) : startYear + 1;
  return { startYear, endYear };
}

export function normalizeSemesterLabel(semester: string) {
  const normalized = semester.trim().toLowerCase();
  if (normalized.includes("first") || normalized === "1" || normalized === "1st") return "1st";
  if (normalized.includes("second") || normalized === "2" || normalized === "2nd") return "2nd";
  if (normalized.includes("third") || normalized === "3" || normalized === "3rd") return "3rd";
  if (normalized.includes("summer")) return "Summer";
  return semester.trim();
}

export function getSemesterOrder(semester: string) {
  const normalized = semester.trim().toLowerCase();
  if (normalized.includes("1") || normalized.includes("first")) return 1;
  if (normalized.includes("2") || normalized.includes("second")) return 2;
  if (normalized.includes("3") || normalized.includes("third")) return 3;
  if (normalized.includes("summer")) return 3;
  return 9;
}

export function buildAcademicPeriodLabel(acadYear: string, semester: string) {
  return `${acadYear} ${normalizeSemesterLabel(semester)}`;
}

export function buildAcademicPeriodOrder(acadYear: string, semester: string) {
  return parseAcademicYearStart(acadYear) * 10 + getSemesterOrder(semester);
}

export function buildAcademicPeriodDate(acadYear: string, semester: string) {
  const { startYear, endYear } = parseAcademicYearBounds(acadYear);
  const order = getSemesterOrder(semester);

  if (order === 1) {
    return new Date(Date.UTC(startYear, 7, 1));
  }

  if (order === 2) {
    return new Date(Date.UTC(endYear, 0, 1));
  }

  return new Date(Date.UTC(endYear, 5, 1));
}

export function parseAcademicPeriodLabel(label: string) {
  const match = label.trim().match(/^(\d{4}\D+\d{4})\s+(.+)$/);
  if (!match) {
    return null;
  }

  return {
    acadYear: match[1].trim(),
    semester: match[2].trim()
  };
}

export function buildAcademicPeriodOrderFromLabel(label: string) {
  const parsed = parseAcademicPeriodLabel(label);
  if (!parsed) {
    return null;
  }

  return buildAcademicPeriodOrder(parsed.acadYear, parsed.semester);
}

export function resolvePeriodDate(value: string) {
  const parsedAcademic = parseAcademicPeriodLabel(value);
  if (parsedAcademic) {
    return buildAcademicPeriodDate(parsedAcademic.acadYear, parsedAcademic.semester);
  }

  if (/^\d{4}-\d{2}$/.test(value)) {
    return new Date(`${value}-01T00:00:00.000Z`);
  }

  return new Date();
}

export function getNextAcademicPeriod(acadYear: string, semester: string) {
  const order = getSemesterOrder(semester);
  const { startYear, endYear } = parseAcademicYearBounds(acadYear);

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
