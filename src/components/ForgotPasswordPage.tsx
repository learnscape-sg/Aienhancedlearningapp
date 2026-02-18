import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useAuth } from './AuthContext';
import { ArrowLeft, Mail } from 'lucide-react';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { resetPasswordForEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await resetPasswordForEmail(email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || '发送失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#F8F9FA]">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#1a73e8]">
              <Mail className="w-5 h-5" />
              邮件已发送
            </CardTitle>
            <CardDescription>
              我们已向 <strong>{email}</strong> 发送了重置密码链接。请查收邮件并点击链接设置新密码。
              <br />
              <span className="text-muted-foreground text-xs mt-2 block">若未收到，请检查垃圾邮件文件夹。</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回登录
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F8F9FA]">
      <Card className="w-full max-w-md shadow-xl border-gray-200">
        <CardHeader>
          <CardTitle className="text-2xl text-[#1a73e8]">忘记密码</CardTitle>
          <CardDescription>输入注册邮箱，我们将发送重置密码链接到您的邮箱</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="输入注册邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full !bg-[#1a73e8] hover:!bg-[#1557b0] !text-white"
              disabled={isLoading}
            >
              {isLoading ? '发送中…' : '发送重置链接'}
            </Button>
            <Link to="/">
              <Button type="button" variant="ghost" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回登录
              </Button>
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
