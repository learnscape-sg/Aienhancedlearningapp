import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Shield, Loader2 } from 'lucide-react';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    // 从邮件链接跳转时，Supabase 会在 URL hash 中带上 type=recovery 和 token
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const type = hashParams.get('type');
    const hasRecoveryHash = type === 'recovery';

    if (hasRecoveryHash) {
      // 有 recovery 参数即视为有效，Supabase 会自动处理 hash 并建立 session
      setIsValidSession(true);
      return;
    }
    // 若无 recovery hash，可能用户直接访问此页
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsValidSession(!!session);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('新密码至少 6 个字符');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw new Error(updateError.message);
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err: any) {
      setError(err.message || '设置失败，请重试。链接可能已过期，请重新申请重置。');
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#F8F9FA]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#1a73e8]" />
          <p className="text-muted-foreground">验证链接中…</p>
        </div>
      </div>
    );
  }

  if (isValidSession === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#F8F9FA]">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle>链接无效或已过期</CardTitle>
            <CardDescription>
              请返回登录页重新申请「忘记密码」。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/')}>
              返回登录
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#F8F9FA]">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-green-600">密码已更新</CardTitle>
            <CardDescription>正在跳转到登录页…</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F8F9FA]">
      <Card className="w-full max-w-md shadow-xl border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1a73e8]">
            <Shield className="w-5 h-5" />
            设置新密码
          </CardTitle>
          <CardDescription>请输入您的新密码</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="new-password">新密码</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="至少 6 个字符"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">确认新密码</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="再次输入新密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full !bg-[#1a73e8] hover:!bg-[#1557b0] !text-white"
              disabled={isLoading || !newPassword || !confirmPassword}
            >
              {isLoading ? '更新中…' : '确认并登录'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
