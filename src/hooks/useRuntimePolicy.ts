import { useEffect, useState } from 'react';
import { getRuntimePolicy, type RuntimeMarketPolicy } from '@/lib/backendApi';
import { useAuth } from '@/components/AuthContext';

export function useRuntimePolicy() {
  const { user } = useAuth();
  const [policy, setPolicy] = useState<RuntimeMarketPolicy | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const role = (user?.role === 'teacher' || user?.role === 'student' || user?.role === 'parent' || user?.role === 'admin')
          ? user.role
          : undefined;
        const result = await getRuntimePolicy({ role });
        if (mounted) setPolicy(result.policy);
      } catch {
        if (mounted) setPolicy(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [user?.role]);

  return { policy, loading };
}
