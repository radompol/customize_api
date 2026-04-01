export interface ReadinessMetrics {
  readinessScore: number;
  readinessLabel: string;
  riskLevel: "Low" | "Medium" | "High";
  priorityLevel: "Routine" | "Watch" | "Urgent";
  warningFlags: string[];
  totalRequirements: number;
  completedRequirements: number;
  pendingRequirements: number;
  averageRevisionCount: number;
  averageCommentCount: number;
  averageAgingDays: number;
}

export interface ReadinessAreaRow extends ReadinessMetrics {
  areaId: string | null;
  areaCode: string | null;
  areaDescription: string | null;
  program: string | null;
}

export interface TrendPoint {
  period: string;
  score: number;
  riskLevel: string;
}
