import { useState, useEffect } from 'react';
import { getStudentMetrics, type StudentMetrics } from '@/lib/backendApi';
import { useAuth } from '@/components/AuthContext';

interface AnalyticsData {
  totalChapters: number;
  completedChapters: number;
  totalTimeSpent: number;
  averageScore: number;
  recentQuizzes: any[];
  weeklyProgress: any[];
  weeklyGoalMinutes?: number;
  weeklyStudyMinutes?: number;
  weeklyProgressPercent?: number;
  streakDays?: number;
  badges?: Array<{ name: string; icon: string; earned: boolean }>;
  earnedBadges?: number;
  badgeDeltaVsLastWeek?: number;
}

const STUDENT_ANALYTICS_CACHE_TTL_MS = 60 * 1000;
const analyticsCache = new Map<string, { expiresAt: number; data: AnalyticsData }>();
const inFlightRequests = new Map<string, Promise<AnalyticsData>>();

function buildEmptyAnalytics(): AnalyticsData {
  return {
    totalChapters: 0,
    completedChapters: 0,
    totalTimeSpent: 0,
    averageScore: 0,
    recentQuizzes: [],
    weeklyProgress: [],
    weeklyGoalMinutes: 70,
    weeklyStudyMinutes: 0,
    weeklyProgressPercent: 0,
    streakDays: 0,
    badges: [],
    earnedBadges: 0,
    badgeDeltaVsLastWeek: 0,
  };
}

function mapMetricsToAnalytics(metrics: StudentMetrics): AnalyticsData {
  return {
    totalChapters: metrics.totalChapters,
    completedChapters: metrics.completedChapters,
    totalTimeSpent: metrics.totalTimeSpent,
    averageScore: metrics.averageScore,
    recentQuizzes: [],
    weeklyProgress: [],
    weeklyGoalMinutes: metrics.weeklyGoalMinutes,
    weeklyStudyMinutes: metrics.weeklyStudyMinutes,
    weeklyProgressPercent: metrics.weeklyProgressPercent,
    streakDays: metrics.streakDays,
    badges: metrics.badges,
    earnedBadges: metrics.earnedBadges,
    badgeDeltaVsLastWeek: metrics.badgeDeltaVsLastWeek,
  };
}

export function useAnalytics() {
  const { user, profileResolved } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async (forceRefresh = false) => {
    if (!profileResolved) {
      setLoading(true);
      return;
    }

    if (!user) {
      setAnalytics(null);
      setLoading(false);
      return;
    }

    if (user?.role && user.role !== 'student') {
      // Non-student roles should not call student-only analytics endpoints.
      setAnalytics(buildEmptyAnalytics());
      setLoading(false);
      return;
    }

    const cacheKey = `${user.id}:student`;
    const now = Date.now();
    const cached = analyticsCache.get(cacheKey);
    if (!forceRefresh && cached && cached.expiresAt > now) {
      setAnalytics(cached.data);
      setLoading(false);
      return;
    }

    try {
      let request = inFlightRequests.get(cacheKey);
      if (!request) {
        request = getStudentMetrics().then(mapMetricsToAnalytics);
        inFlightRequests.set(cacheKey, request);
      }
      const data = await request;
      analyticsCache.set(cacheKey, { data, expiresAt: now + STUDENT_ANALYTICS_CACHE_TTL_MS });
      setAnalytics(data);
    } catch (error) {
      // For non-student access/unauthorized edge cases, fallback silently.
      const message = error instanceof Error ? error.message : String(error);
      const isExpectedAuthEdge =
        message.includes('Student access required') ||
        message.includes('Unauthorized. Missing bearer token') ||
        message.includes('Unauthorized. Invalid token');
      if (!isExpectedAuthEdge) {
        console.error('Error loading analytics:', error);
      }
      // Graceful fallback: show empty-state values instead of mock numbers.
      setAnalytics(buildEmptyAnalytics());
    } finally {
      inFlightRequests.delete(`${user.id}:student`);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [profileResolved, user?.id, user?.role]);

  return {
    analytics,
    loading,
    refresh: () => loadAnalytics(true)
  };
}