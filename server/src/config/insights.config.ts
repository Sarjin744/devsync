import { ProjectHealth, ProjectHealthStatus } from '@devsync/shared';

export const INSIGHTS_CONFIG = {
  OVERDUE_CRITICAL_PERCENT: 25,
  OVERDUE_CRITICAL_COUNT: 5,
  OVERDUE_AT_RISK_PERCENT: 10,
  OVERDUE_AT_RISK_COUNT: 2,
  COMPLETION_HEALTHY_BONUS_PERCENT: 60,
} as const;

export function calculateProjectHealth(params: {
  totalTasks: number;
  openTasks: number;
  completedTasks: number;
  overdueTasks: number;
}): ProjectHealth {
  const { totalTasks, openTasks, completedTasks, overdueTasks } = params;

  if (totalTasks === 0) {
    return {
      status: 'HEALTHY',
      label: 'Healthy (No active tasks)',
      score: 100,
      reasons: ['No tasks created yet.'],
    };
  }

  const completionRate = Math.round((completedTasks / totalTasks) * 100);
  const overdueRate = openTasks > 0 ? Math.round((overdueTasks / openTasks) * 100) : 0;
  const reasons: string[] = [];

  let status: ProjectHealthStatus = 'HEALTHY';
  let score = 100;

  // Overdue penalties
  score -= overdueTasks * 10;
  score -= overdueRate * 0.5;

  // Completion bonuses
  score += completionRate * 0.3;

  score = Math.max(10, Math.min(100, Math.round(score)));

  if (
    overdueTasks >= INSIGHTS_CONFIG.OVERDUE_CRITICAL_COUNT ||
    overdueRate >= INSIGHTS_CONFIG.OVERDUE_CRITICAL_PERCENT
  ) {
    status = 'CRITICAL';
    reasons.push(
      `High overdue rate: ${overdueTasks} overdue tasks (${overdueRate}% of active tasks).`,
    );
  } else if (
    overdueTasks >= INSIGHTS_CONFIG.OVERDUE_AT_RISK_COUNT ||
    overdueRate >= INSIGHTS_CONFIG.OVERDUE_AT_RISK_PERCENT
  ) {
    status = 'AT_RISK';
    reasons.push(
      `Moderate overdue tasks: ${overdueTasks} overdue tasks (${overdueRate}% of active tasks).`,
    );
  } else {
    status = 'HEALTHY';
    reasons.push('Tasks are progressing on schedule.');
    if (completionRate >= 50) {
      reasons.push(`Strong completion rate at ${completionRate}%.`);
    }
  }

  const label =
    status === 'CRITICAL'
      ? `Critical (${overdueTasks} overdue)`
      : status === 'AT_RISK'
      ? `At Risk (${overdueTasks} overdue)`
      : `Healthy (${completionRate}% done)`;

  return {
    status,
    label,
    score,
    reasons,
  };
}
