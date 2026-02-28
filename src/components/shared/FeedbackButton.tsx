import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquare, X, Star, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { submitFeedback, trackProductEvent } from '@/lib/backendApi';
import { supabase } from '@/utils/supabase/client';

type FeedbackType = 'bug' | 'suggestion' | 'other';

function getPageName(path: string): string {
  const pageNames: Record<string, string> = {
    '/': '首页',
    '/forgot-password': '忘记密码',
    '/reset-password': '重置密码',
  };
  if (path.startsWith('/course/')) return '课程详情页';
  if (path.startsWith('/shared-course/')) return '分享课程页';
  if (path.startsWith('/shared-twin/')) return '共享 Twin 页';
  return pageNames[path] || path || '未知页面';
}

export function FeedbackButton() {
  const location = useLocation();
  const pathname = location.pathname;
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    pagePath: pathname || '/',
    pageName: getPageName(pathname || '/'),
    feedbackText: '',
    rating: undefined as number | undefined,
    feedbackType: undefined as FeedbackType | undefined,
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      pagePath: pathname || '/',
      pageName: getPageName(pathname || '/'),
    }));
  }, [pathname]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.feedbackText.trim()) return;
    setIsSubmitting(true);
    setSubmitStatus('idle');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      await submitFeedback(formData, token);
      await trackProductEvent(
        {
          eventName: 'feedback_submitted',
          role: sessionData.session?.user ? 'student' : 'anon',
          language: undefined,
          properties: {
            pagePath: formData.pagePath,
            pageName: formData.pageName,
            feedbackType: formData.feedbackType || 'other',
            rating: formData.rating ?? null,
          },
        },
        token
      );
      setSubmitStatus('success');
      setFormData({
        pagePath: pathname || '/',
        pageName: getPageName(pathname || '/'),
        feedbackText: '',
        rating: undefined,
        feedbackType: undefined,
      });
      setTimeout(() => {
        setIsOpen(false);
        setSubmitStatus('idle');
      }, 2000);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setIsOpen(false);
      setSubmitStatus('idle');
      setFormData((prev) => ({
        ...prev,
        feedbackText: '',
        rating: undefined,
        feedbackType: undefined,
      }));
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 99999,
          width: '64px',
          height: '64px',
        }}
        className="bg-gradient-to-br from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white rounded-full shadow-2xl hover:shadow-cyan-500/50 transition-all duration-300 flex items-center justify-center group hover:scale-110 animate-float"
        aria-label="提供反馈"
        title="提供反馈"
      >
        <MessageSquare size={24} className="group-hover:scale-110 transition-transform" />
        <span
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '12px',
            height: '12px',
            zIndex: 10,
          }}
          className="bg-red-500 rounded-full animate-pulse border-2 border-white"
        />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={handleClose}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-900">页面反馈</h2>
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="关闭"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">当前页面</label>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-sm text-slate-600">{formData.pageName}</div>
                  <div className="text-xs text-slate-400 mt-1">{formData.pagePath}</div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  反馈内容 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.feedbackText}
                  onChange={(e) => setFormData((prev) => ({ ...prev, feedbackText: e.target.value }))}
                  placeholder="请描述您遇到的问题或建议..."
                  required
                  rows={5}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none disabled:bg-slate-50 disabled:cursor-not-allowed text-sm text-slate-700"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">评分（可选）</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          rating: prev.rating === rating ? undefined : rating,
                        }))
                      }
                      disabled={isSubmitting}
                      className={`p-2 rounded-lg transition-all ${
                        formData.rating === rating
                          ? 'bg-yellow-100 text-yellow-600'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <Star size={20} className={formData.rating === rating ? 'fill-current' : ''} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">反馈类型（可选）</label>
                <select
                  value={formData.feedbackType || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      feedbackType: e.target.value ? (e.target.value as FeedbackType) : undefined,
                    }))
                  }
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:bg-slate-50 disabled:cursor-not-allowed text-sm text-slate-700"
                >
                  <option value="">请选择...</option>
                  <option value="bug">Bug 报告</option>
                  <option value="suggestion">功能建议</option>
                  <option value="other">其他</option>
                </select>
              </div>

              {submitStatus === 'success' && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  <CheckCircle size={18} />
                  <span>反馈提交成功！感谢您的反馈。</span>
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle size={18} />
                  <span>提交失败，请稍后重试。</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.feedbackText.trim()}
                  className="flex-1 px-4 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>提交中...</span>
                    </>
                  ) : (
                    '提交反馈'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
