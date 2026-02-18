import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';

interface AnalyticsData {
  totalChapters: number;
  completedChapters: number;
  totalTimeSpent: number;
  averageScore: number;
  recentQuizzes: any[];
  weeklyProgress: any[];
}

export function useAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        // Try backend first
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-82343da6/analytics`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const { analytics } = await response.json();
          setAnalytics(analytics);
          return;
        }
      } catch (error) {
        console.log('Backend failed, calculating from localStorage:', error);
      }
      
      // Fallback: calculate analytics from localStorage
      if (session?.user) {
        const progressData = localStorage.getItem(`progress_${session.user.id}`);
        if (progressData) {
          const progress = JSON.parse(progressData);
          const progressArray = Object.values(progress) as any[];
          
          const mockAnalytics: AnalyticsData = {
            totalChapters: progressArray.length || 5,
            completedChapters: progressArray.filter((p: any) => p.completed).length,
            totalTimeSpent: progressArray.reduce((sum: number, p: any) => sum + (p.timeSpent || 0), 0),
            averageScore: 85, // Mock score
            recentQuizzes: [],
            weeklyProgress: progressArray.slice(-7)
          };
          
          setAnalytics(mockAnalytics);
        } else {
          // Default mock data
          setAnalytics({
            totalChapters: 5,
            completedChapters: 0,
            totalTimeSpent: 0,
            averageScore: 0,
            recentQuizzes: [],
            weeklyProgress: []
          });
        }
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
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