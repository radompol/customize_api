import { DEFAULT_FORECAST_PERIODS, DEFAULT_LOOKBACK } from "@/lib/constants";
import { addMonths, getNextAcademicPeriod } from "@/lib/dateUtils";
import { buildLookbackWindows } from "@/lib/featureBuilder";
import { resolveRiskLevel } from "@/lib/riskRules";
import { minMaxScale } from "@/lib/scaler";
import type { ForecastPoint, ForecastResult } from "@/models/forecast.types";

export type SnapshotSeries = {
  snapshotDate: Date;
  readinessScore: number;
  periodLabel?: string;
  periodOrder?: number;
  acadYear?: string;
  semester?: string;
};

export function toSnapshotSeries<T extends { snapshotDate: Date; readinessScore: number }>(snapshot: T & {
  periodLabel?: string | null;
  periodOrder?: number | null;
  acadYear?: string | null;
  semester?: string | null;
}): SnapshotSeries {
  return {
    snapshotDate: snapshot.snapshotDate,
    readinessScore: snapshot.readinessScore,
    periodLabel: snapshot.periodLabel ?? undefined,
    periodOrder: snapshot.periodOrder ?? undefined,
    acadYear: snapshot.acadYear ?? undefined,
    semester: snapshot.semester ?? undefined
  };
}

export function buildTimeSeriesDataset(snapshots: SnapshotSeries[], lookback = DEFAULT_LOOKBACK) {
  const ordered = snapshots
    .slice()
    .sort((left, right) =>
      (left.periodOrder ?? left.snapshotDate.getTime()) - (right.periodOrder ?? right.snapshotDate.getTime())
    );
  const scores = ordered.map((snapshot) => snapshot.readinessScore);
  return { ordered, scores, ...buildLookbackWindows(scores, lookback) };
}

async function trainWithTensorflow(series: number[], lookback: number) {
  const tf = await import("@tensorflow/tfjs");
  await tf.ready();
  const { scaled, invert } = minMaxScale(series);
  const scaledWindows = buildLookbackWindows(scaled, lookback);

  const xs = tf.tensor2d(scaledWindows.inputs);
  const ys = tf.tensor2d(scaledWindows.outputs, [scaledWindows.outputs.length, 1]);

  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [lookback], units: 12, activation: "relu" }));
  model.add(tf.layers.dense({ units: 8, activation: "relu" }));
  model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));
  model.compile({ optimizer: tf.train.adam(0.03), loss: "meanSquaredError" });

  const history = await model.fit(xs, ys, { epochs: 80, verbose: 0 });
  const window = scaled.slice(-lookback);

  return {
    mode: "tensorflow" as const,
    lossValue: Number(history.history.loss.at(-1) ?? 0),
    predictNext: (periods: number) => {
      const output: number[] = [];
      const rollingWindow = [...window];

      for (let index = 0; index < periods; index += 1) {
        const tensor = tf.tensor2d([rollingWindow]);
        const predicted = model.predict(tensor) as typeof tensor;
        const value = Number(predicted.dataSync()[0]);
        tensor.dispose();
        predicted.dispose();
        output.push(invert(value));
        rollingWindow.shift();
        rollingWindow.push(value);
      }

      return output;
    }
  };
}

function fallbackProjection(series: number[], lookback: number) {
  const window = series.slice(-lookback);
  const last = window.at(-1) ?? 0;
  const slope = window.length <= 1 ? 0 : (window.at(-1)! - window[0]) / (window.length - 1);

  return {
    mode: "fallback" as const,
    lossValue: null,
    predictNext: (periods: number) => {
      const output: number[] = [];
      for (let index = 1; index <= periods; index += 1) {
        output.push(Number(Math.max(0, Math.min(1, last + slope * index * 0.6)).toFixed(4)));
      }
      return output;
    }
  };
}

export function classifyTrendDirection(values: number[]): "Improving" | "Stable" | "Declining" | "Volatile" {
  if (values.length < 2) return "Stable";

  let positive = 0;
  let negative = 0;
  for (let index = 1; index < values.length; index += 1) {
    const delta = values[index] - values[index - 1];
    if (delta > 0.015) positive += 1;
    if (delta < -0.015) negative += 1;
  }

  if (positive && negative) return "Volatile";
  if (positive) return "Improving";
  if (negative) return "Declining";
  return "Stable";
}

export async function trainForecastModel(snapshots: SnapshotSeries[], lookback = DEFAULT_LOOKBACK) {
  const series = snapshots
    .slice()
    .sort((left, right) =>
      (left.periodOrder ?? left.snapshotDate.getTime()) - (right.periodOrder ?? right.snapshotDate.getTime())
    )
    .map((snapshot) => snapshot.readinessScore);

  if (series.length <= lookback) {
    return fallbackProjection(series, Math.min(Math.max(series.length, 1), lookback));
  }

  try {
    return await trainWithTensorflow(series, lookback);
  } catch {
    return fallbackProjection(series, lookback);
  }
}

export async function predictNextPeriods(
  snapshots: SnapshotSeries[],
  periods = DEFAULT_FORECAST_PERIODS,
  lookback = DEFAULT_LOOKBACK
): Promise<ForecastResult> {
  const ordered = snapshots
    .slice()
    .sort((left, right) =>
      (left.periodOrder ?? left.snapshotDate.getTime()) - (right.periodOrder ?? right.snapshotDate.getTime())
    );
  const currentScore = ordered.at(-1)?.readinessScore ?? 0;
  const trainer = await trainForecastModel(ordered, lookback);
  const projectedScores = trainer.predictNext(periods);
  const startDate = ordered.at(-1)?.snapshotDate ?? new Date();
  const lastPeriod = ordered.at(-1);

  let nextAcadYear = lastPeriod?.acadYear;
  let nextSemester = lastPeriod?.semester;

  const forecast: ForecastPoint[] = projectedScores.map((score, index) => {
    let period: string;

    if (nextAcadYear && nextSemester) {
      const next = getNextAcademicPeriod(nextAcadYear, nextSemester);
      nextAcadYear = next.acadYear;
      nextSemester = next.semester;
      period = next.label;
    } else {
      period = addMonths(startDate, index + 1).toISOString().slice(0, 7);
    }

    return {
      period,
      score: Number(score.toFixed(4)),
      riskLevel: resolveRiskLevel(score)
    };
  });

  return {
    currentScore: Number(currentScore.toFixed(4)),
    forecast,
    trendDirection: classifyTrendDirection([currentScore, ...projectedScores]),
    confidenceNote: ordered.length < 4 ? "Low historical depth" : "Forecast generated from readiness snapshots",
    modelMeta: {
      mode: trainer.mode,
      lookback,
      seriesLength: ordered.length,
      lossValue: trainer.lossValue
    }
  };
}
