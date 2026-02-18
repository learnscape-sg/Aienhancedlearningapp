import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';

interface ProgressData {
  chapterId: string;
  progress: number;
  completed: boolean;
  timeSpent: number;
}

export function useProgressTracker() {
  const [progressData, setProgressData] = useState<{[key: string]: ProgressData}>({});

  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    if (!token) throw new Error('Not authenticated');
    
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-82343da6${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'Request failed');
    }
    
    return response.json();
  };

  const loadProgress = async () => {
    try {
      // Try to load from backend first
      try {
        const { progress } = await apiCall('/progress');
        const progressMap: {[key: string]: ProgressData} = {};
        
        progress.forEach((item: any) => {
          progressMap[item.chapterId] = item;
        });
        
        setProgressData(progressMap);
        
        // Also save to localStorage as backup
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          localStorage.setItem(`progress_${session.user.id}`, JSON.stringify(progressMap));
        }
        return;
      } catch (error) {
        console.log('Backend failed, loading from localStorage:', error);
      }
      
      // Fallback to localStorage
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const localProgress = localStorage.getItem(`progress_${session.user.id}`);
        if (localProgress) {
          setProgressData(JSON.parse(localProgress));
        }
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const updateProgress = async (chapterId: string, progress: number, completed: boolean = false, timeSpent: number = 0) => {
    const newProgressData = {
      chapterId,
      progress,
      completed,
      timeSpent: (progressData[chapterId]?.timeSpent || 0) + timeSpent
    };
    
    // Update local state immediately
    setProgressData(prev => ({
      ...prev,
      [chapterId]: newProgressData
    }));
    
    try {
      // Try to save to backend
      await apiCall('/progress', {
        method: 'POST',
        body: JSON.stringify(newProgressData),
      });
    } catch (error) {
      console.log('Backend update failed, using localStorage:', error);
    }
    
    // Always save to localStorage as backup
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const updatedProgress = {
          ...progressData,
          [chapterId]: newProgressData
        };
        localStorage.setItem(`progress_${session.user.id}`, JSON.stringify(updatedProgress));
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  const saveQuizResult = async (chapterId: string, score: number, answers: any[], timeSpent: number) => {
    try {
      await apiCall('/quiz-result', {
        method: 'POST',
        body: JSON.stringify({
          chapterId,
          score,
          answers,
          timeSpent
        }),
      });
    } catch (error) {
      console.error('Error saving quiz result:', error);
    }
  };

  useEffect(() => {
    loadProgress();
  }, []);

  return {
    progressData,
    updateProgress,
    saveQuizResult,
    loadProgress
  };
}