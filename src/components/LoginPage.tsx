import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useAuth } from './AuthContext';
import { Upload } from 'lucide-react';

interface LoginPageProps {
  onSuccess: () => void;
  onQuickExperience?: () => void;
}

export function LoginPage({ onSuccess, onQuickExperience }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'student' | 'teacher' | 'parent'>('student');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await login(email, password);
      onSuccess();
    } catch (error: any) {
      console.error('Login failed:', error);
      setError(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await register(email, password, name, role);
      onSuccess();
    } catch (error: any) {
      console.error('Registration failed:', error);
      setError(error.message || 'Registration failed');
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
            <div className="absolute top-8 right-8 w-80 h-80 bg-white/30 rounded-full blur-3xl"></div>
            <div className="absolute bottom-16 right-16 w-60 h-60 bg-white/40 rounded-full blur-2xl"></div>
          </div>
          
          <div className="relative z-10 h-full flex items-center justify-center px-8">
            <div className="max-w-lg space-y-8">
              <div className="space-y-6">
                <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                  为每位学习者<br />
                  <span className="text-indigo-600">重塑</span><br />
                  自学体验
                </h1>
                
                <p className="text-lg text-gray-700 leading-relaxed">
                  AI随心学将教材和学习资料转化为引人入胜的多媒体学习体验，为你量身定制。
                </p>
                
                <Button 
                  size="lg" 
                  className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
                  onClick={onQuickExperience}
                >
                  <Upload className="w-5 h-5 mr-2" />
                  立即体验AI随心学：上传你的PDF
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login/Register Form */}
        <div className="flex items-center justify-center p-8 bg-white">
          <div className="w-full max-w-md">
            <Card className="w-full shadow-xl border-gray-200">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-[#1a73e8]">欢迎使用</CardTitle>
              <CardDescription>登录或注册开始您的学习之旅</CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Demo Credentials */}
              <div className="mb-4 space-y-2">
                {/* Student Demo */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#1a73e8] mb-1">学生演示账号:</p>
                      <p className="text-gray-600 text-xs">邮箱: student@demo.com</p>
                      <p className="text-gray-600 text-xs">密码: 任意密码</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="ml-2"
                      onClick={async () => {
                        setEmail('student@demo.com');
                        setPassword('demo123');
                        try {
                          setIsLoading(true);
                          setError('');
                          await login('student@demo.com', 'demo123', 'student');
                          onSuccess();
                        } catch (error: any) {
                          setError(error.message || '登录失败');
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      disabled={isLoading}
                    >
                      快速登录
                    </Button>
                  </div>
                </div>
                
                {/* Teacher Demo */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-blue-600 mb-1">教师演示账号:</p>
                      <p className="text-blue-700 text-xs">邮箱: teacher@demo.com</p>
                      <p className="text-blue-700 text-xs">密码: 任意密码</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="ml-2 border-blue-300 text-blue-600 hover:bg-blue-100"
                      onClick={async () => {
                        setEmail('teacher@demo.com');
                        setPassword('demo123');
                        try {
                          setIsLoading(true);
                          setError('');
                          await login('teacher@demo.com', 'demo123', 'teacher');
                          onSuccess();
                        } catch (error: any) {
                          setError(error.message || '登录失败');
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      disabled={isLoading}
                    >
                      快速登录
                    </Button>
                  </div>
                </div>
              </div>

              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-lg">
                  <TabsTrigger value="login" className="data-[state=active]:bg-white data-[state=active]:text-[#1a73e8] data-[state=active]:shadow-sm">登录</TabsTrigger>
                  <TabsTrigger value="register" className="data-[state=active]:bg-white data-[state=active]:text-[#1a73e8] data-[state=active]:shadow-sm">注册</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">邮箱</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="输入您的邮箱"
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
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">姓名</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="输入您的姓名"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">邮箱</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="输入您的邮箱"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">密码</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="创建密码"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">角色</Label>
                      <select
                        id="role"
                        value={role}
                        onChange={(e) => setRole(e.target.value as 'student' | 'teacher' | 'parent')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:border-[#1a73e8]"
                      >
                        <option value="student">学生</option>
                        <option value="teacher">教师</option>
                        <option value="parent">家长</option>
                      </select>
                    </div>
                    <Button 
                      type="submit" 
                      variant="default"
                      className="w-full !bg-[#1a73e8] hover:!bg-[#1557b0] !text-white"
                      disabled={isLoading}
                    >
                      {isLoading ? '注册中...' : '注册'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    </div>
  );
}