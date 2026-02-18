import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Shield } from 'lucide-react';

interface ChangePasswordCardProps {
  onChangePassword: (newPassword: string) => Promise<void>;
}

export function ChangePasswordCard({ onChangePassword }: ChangePasswordCardProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setSuccess(false);
    if (newPassword.length < 6) {
      setError('新密码至少 6 个字符');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }
    setIsLoading(true);
    try {
      await onChangePassword(newPassword);
      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e.message || '修改失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          修改密码
        </CardTitle>
        <CardDescription>定期更换密码可提高账户安全性</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>新密码</Label>
          <Input
            type="password"
            placeholder="至少 6 个字符"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div>
          <Label>确认新密码</Label>
          <Input
            type="password"
            placeholder="再次输入新密码"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-600">密码已更新</p>}
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !newPassword || !confirmPassword}
        >
          {isLoading ? '更新中…' : '修改密码'}
        </Button>
      </CardContent>
    </Card>
  );
}
