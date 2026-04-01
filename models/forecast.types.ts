export interface ForecastPoint {
  period: string;
  score: number;
  riskLevel: string;
}

export interface ForecastResult {
  currentScore: number;
  forecast: ForecastPoint[];
  trendDirection: "Improving" | "Stable" | "Declining" | "Volatile";
  confidenceNote: string;
  modelMeta: {
    mode: "tensorflow" | "fallback";
    lookback: number;
    seriesLength: number;
    lossValue: number | null;
  };
}
