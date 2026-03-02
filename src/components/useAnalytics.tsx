import { useState, useEffect } from 'react';
import { getStudentMetrics, type StudentMetrics } from '@/lib/backendApi';

interface AnalyticsData {
  totalChapters: number;
  completedChapters: number;
  totalTimeSpent: number;
  averageScore: number;
  recentQuizzes: any[];
  weeklyProgress: any[];
  weeklyGoalHours?: number;
  weeklyStudyHours?: number;
  weeklyProgressPercent?: number;
  streakDays?: number;
  badges?: Array<{ name: string; icon: string; earned: boolean }>;
  earnedBadges?: number;
  badgeDeltaVsLastWeek?: number;
}

export function useAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    try {
      const metrics: StudentMetrics = await getStudentMetrics();
      setAnalytics({
        totalChapters: metrics.totalChapters,
        completedChapters: metrics.completedChapters,
        totalTimeSpent: metrics.totalTimeSpent,
        averageScore: metrics.averageScore,
        recentQuizzes: [],
        weeklyProgress: [],
        weeklyGoalHours: metrics.weeklyGoalHours,
        weeklyStudyHours: metrics.weeklyStudyHours,
        weeklyProgressPercent: metrics.weeklyProgressPercent,
        streakDays: metrics.streakDays,
        badges: metrics.badges,
        earnedBadges: metrics.earnedBadges,
        badgeDeltaVsLastWeek: metrics.badgeDeltaVsLastWeek,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
      // Graceful fallback: show empty-state values instead of mock numbers.
      setAnalytics({
        totalChapters: 0,
        completedChapters: 0,
        totalTimeSpent: 0,
        averageScore: 0,
        recentQuizzes: [],
        weeklyProgress: [],
        weeklyGoalHours: 18,
        weeklyStudyHours: 0,
        weeklyProgressPercent: 0,
        streakDays: 0,
        badges: [],
        earnedBadges: 0,
        badgeDeltaVsLastWeek: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  return {
    analytics,
    loading,
    refresh: loadAnalytics
  };
}