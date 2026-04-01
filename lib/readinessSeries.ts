import { buildTrendSeries } from "@/lib/aggregation";
import {
  aggregateInstitutionReadiness,
  aggregateProgramReadiness,
  type LightweightRecord
} from "@/lib/readinessEngine";
import {
  buildAcademicPeriodDate,
  buildAcademicPeriodLabel,
  buildAcademicPeriodOrder,
  buildAcademicPeriodOrderFromLabel
} from "@/lib/dateUtils";
import { predictNextPeriods } from "@/lib/forecasting";

type PeriodScopedRecord = LightweightRecord & {
  acadYear: string;
  semester: string;
};

export type ReadinessSeriesScope = {
  program?: string | null;
  period?: string | null;
  areaId?: string | null;
};

export function buildScopedPeriodSeries(records: PeriodScopedRecord[], scope: ReadinessSeriesScope) {
  const minPeriodOrder = scope.period ? buildAcademicPeriodOrderFromLabel(scope.period) : null;
  const scoped = records.filter((record) => {
    const matchesProgram = !scope.program || record.program === scope.program;
    const matchesArea = !scope.areaId || record.areaId === scope.areaId;
    const periodOrder = buildAcademicPeriodOrder(record.acadYear, record.semester);
    const matchesPeriod = minPeriodOrder == null || periodOrder >= minPeriodOrder;
    return matchesProgram && matchesArea && matchesPeriod;
  });

  const groups = new Map<string, PeriodScopedRecord[]>();
  scoped.forEach((record) => {
    const key = `${record.acadYear}::${record.semester}`;
    groups.set(key, [...(groups.get(key) ?? []), record]);
  });

  return Array.from(groups.entries())
    .map(([key, group]) => {
      const [acadYear, semester] = key.split("::");
      const periodLabel = buildAcademicPeriodLabel(acadYear, semester);
      const periodOrder = buildAcademicPeriodOrder(acadYear, semester);
      const metrics = scope.program ? aggregateProgramReadiness(group) : aggregateInstitutionReadiness(group);

      return {
        snapshotDate: buildAcademicPeriodDate(acadYear, semester),
        periodLabel,
        periodOrder,
        acadYear,
        semester,
        readinessScore: metrics.readinessScore,
        riskLevel: metrics.riskLevel
      };
    })
    .sort((left, right) => left.periodOrder - right.periodOrder);
}

export function buildScopedTrend(records: PeriodScopedRecord[], scope: ReadinessSeriesScope) {
  return buildTrendSeries(buildScopedPeriodSeries(records, scope));
}

export function buildScopedForecast(records: PeriodScopedRecord[], scope: ReadinessSeriesScope) {
  return predictNextPeriods(buildScopedPeriodSeries(records, scope));
}
