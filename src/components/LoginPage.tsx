import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useAuth } from './AuthContext';
import { resolveRuntimeExperienceConfig } from '@/lib/entryDetector';
import { resolveLogin } from '@/lib/backendApi';

interface LoginPageProps {
  onSuccess: () => void;
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const experience = resolveRuntimeExperienceConfig();

  const redirectTo = searchParams.get('redirect');
  const handlePostAuth = () => {
    if (redirectTo && redirectTo.startsWith('/')) {
      navigate(redirectTo);
    } else {
      onSuccess();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const identifier = email.trim();
      const loginEmail = identifier.includes('@')
        ? identifier
        : (await resolveLogin(identifier)).email;
      await login(loginEmail, password);
      handlePostAuth();
    } catch (error: any) {
      console.error('Login failed:', error);
      const msg = error?.message || 'Login failed';
      const isEmailNotConfirmed = /email not confirmed/i.test(msg);
      setError(isEmailNotConfirmed
        ? '邮箱尚未验证，请先点击注册邮件中的确认链接，或联系管理员确认账号。'
        : msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F8F9FA]">
      <div className="w-full grid lg:grid-cols-2">
        {/* Left side - Hero Design */}
        <div className="hidden lg:block relative overflow-hidden">
          {/* Background with organic shapes */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-200 via-orange-300 to-orange-400 opacity-80"></div>
          <div className="absolute top-0 right-0 w-1/2 h-full">
            <div className="absolute top-8 right-8 w-80 h-80 bg-white/30 rounded-full blur-2xl motion-reduce:blur-lg will-change-transform"></div>
            <div className="absolute bottom-16 right-16 w-60 h-60 bg-white/40 rounded-full blur-xl motion-reduce:blur-md will-change-transform"></div>
          </div>
          
          <div className="relative z-10 h-full flex items-center justify-center px-8">
            <div className="max-w-lg space-y-8">
              <div className="space-y-6">
                <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                  {experience.entry.defaultLanguageSpace === 'zh' ? (
                    <>
                      为每位学习者<br />
                      <span className="text-indigo-600">重塑</span><br />
                      自学体验
                    </>
                  ) : (
                    <>
                      Reimagine<br />
                      <span className="text-indigo-600">Self Learning</span><br />
                      for Every Learner
                    </>
                  )}
                </h1>
                
                <p className="text-lg text-gray-700 leading-relaxed">
                  {experience.entry.defaultLanguageSpace === 'zh'
                    ? 'AI随心学将教材和学习资料转化为引人入胜的多媒体学习体验，为你量身定制。'
                    : 'LearnYourWay AI transforms learning materials into engaging, personalized experiences.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className="flex items-center justify-center p-8 bg-white">
          <div className="w-full max-w-md">
            <Card className="w-full shadow-xl border-gray-200">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-[#1a73e8]">
                {experience.entry.defaultLanguageSpace === 'zh' ? '欢迎使用' : `Welcome to ${experience.brand.labels.appName}`}
              </CardTitle>
              <CardDescription>
                {experience.entry.defaultLanguageSpace === 'zh'
                  ? '登录开始您的学习之旅'
                  : 'Sign in to start learning'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">邮箱 / 手机号 / 账号</Label>
                      <Input
                        id="email"
                        type="text"
                        placeholder="输入邮箱、手机号或账号名"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">密码</Label>
                        <Link
                          to="/forgot-password"
                          className="text-sm text-[#1a73e8] hover:underline"
                        >
                          忘记密码？
                        </Link>
                      </div>
                      <Input
                        id="password"
                        type="password"
                        placeholder="输入您的密码"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      variant="default"
                      className="w-full !bg-[#1a73e8] hover:!bg-[#1557b0] !text-white"
                      disabled={isLoading}
                    >
                      {isLoading ? '登录中...' : '登录'}
                    </Button>
              </form>
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    </div>
  );
}