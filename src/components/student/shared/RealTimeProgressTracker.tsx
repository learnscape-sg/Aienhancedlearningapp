import React, { useEffect, useState } from 'react';
import { TrendingUp, Lightbulb, Target, Zap, Sparkles, CheckCircle2 } from 'lucide-react';
import type { ChatMessage } from '@/types/backend';

interface ProgressMilestone {
  id: string;
  type: 'question' | 'edit' | 'insight' | 'completion';
  timestamp: number;
  message: string;
  points: number;
  icon: React.ReactNode;
}

interface RealTimeMetrics {
  totalQuestions: number;
  totalEdits: number;
  deepInsights: number;
  taskProgress: number;
  selfDriveScore: number;
  focusScore: number;
  thinkingScore: number;
  improvementScore: number;
  recentMilestones: ProgressMilestone[];
}

interface RealTimeProgressTrackerProps {
  messages: ChatMessage[];
  studentLog: string[];
  currentTaskIndex: number;
  totalTasks: number;
  improvementCount: number;
  completedTasksCount: number;
}

export const RealTimeProgressTracker: React.FC<RealTimeProgressTrackerProps> = ({
  messages,
  studentLog,
  currentTaskIndex,
  totalTasks,
  improvementCount,
  completedTasksCount,
}) => {
  const [metrics, setMetrics] = useState<RealTimeMetrics>({
    totalQuestions: 0,
    totalEdits: 0,
    deepInsights: 0,
    taskProgress: 0,
    selfDriveScore: 0,
    focusScore: 0,
    thinkingScore: 0,
    improvementScore: 0,
    recentMilestones: [],
  });

  useEffect(() => {
    const userInputs = messages.filter((m) => m.role === 'user');
    const questions = userInputs.filter((input) => {
      const text = input.text;
      return /[？?]|什么|为什么|如何|怎么|怎样|能否|可以吗/.test(text);
    }).length;

    const deepInsights = userInputs.filter((input) => {
      const text = input.text;
      return (
        (/为什么|如何|原理|本质|关系|联系|机制|原因/.test(text) && text.length > 20) ||
        (text.length > 50 && /思考|理解|发现|探索/.test(text))
      );
    }).length;

    const completionRate = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;

    const selfDriveScore = Math.min(
      100,
      (questions > 0 ? 25 : 0) +
        (improvementCount > 3 ? 35 : improvementCount * 8) +
        (completionRate > 50 ? 30 : completionRate * 0.5) +
        (userInputs.length > 3 ? 10 : 0)
    );

    const focusScore = Math.min(
      100,
      (userInputs.length > 5 ? 35 : userInputs.length * 6) +
        (improvementCount > 5 ? 30 : improvementCount * 5) +
        (deepInsights > 0 ? 25 : 0) +
        (completionRate > 30 ? 10 : 0)
    );

    const thinkingScore = Math.min(
      100,
      deepInsights * 20 + (questions > 2 ? 35 : questions * 12) + (improvementCount > 3 ? 30 : 0) + (userInputs.length > 4 ? 15 : 0)
    );

    const improvementScore = Math.min(100, (improvementCount > 5 ? 45 : improvementCount * 7) + (improvementCount > 0 ? 30 : 0));

    setMetrics((prevMetrics) => {
      const newMilestones: ProgressMilestone[] = [];

      if (questions > prevMetrics.totalQuestions && questions > 0) {
        if (questions === 1) {
          newMilestones.push({
            id: `q-${Date.now()}`,
            type: 'question',
            timestamp: Date.now(),
            message: '你提出了第一个问题！💡',
            points: 10,
            icon: <Lightbulb className="w-4 h-4" />,
          });
        } else if (questions % 3 === 0 && prevMetrics.totalQuestions % 3 !== 0) {
          newMilestones.push({
            id: `q-${Date.now()}`,
            type: 'question',
            timestamp: Date.now(),
            message: `你已经提出了 ${questions} 个问题！继续探索！`,
            points: 15,
            icon: <Lightbulb className="w-4 h-4" />,
          });
        }
      }

      if (improvementCount > prevMetrics.totalEdits && improvementCount > 0) {
        if (improvementCount === 1) {
          newMilestones.push({
            id: `e-${Date.now()}`,
            type: 'edit',
            timestamp: Date.now(),
            message: '你开始改进你的答案了！✨',
            points: 10,
            icon: <Zap className="w-4 h-4" />,
          });
        } else if (improvementCount % 3 === 0 && prevMetrics.totalEdits % 3 !== 0) {
          newMilestones.push({
            id: `e-${Date.now()}`,
            type: 'edit',
            timestamp: Date.now(),
            message: `你已经进行了 ${improvementCount} 次改进！精益求精！`,
            points: 15,
            icon: <Zap className="w-4 h-4" />,
          });
        }
      }

      if (deepInsights > prevMetrics.deepInsights) {
        newMilestones.push({
          id: `i-${Date.now()}`,
          type: 'insight',
          timestamp: Date.now(),
          message: '你展现了深度思考！🌟',
          points: 20,
          icon: <Sparkles className="w-4 h-4" />,
        });
      }

      if (completionRate > prevMetrics.taskProgress && completionRate > 0) {
        newMilestones.push({
          id: `c-${Date.now()}`,
          type: 'completion',
          timestamp: Date.now(),
          message: `已完成 ${completedTasksCount}/${totalTasks} 个任务！继续加油！🎯`,
          points: 25,
          icon: <CheckCircle2 className="w-4 h-4" />,
        });
      }

      return {
        totalQuestions: questions,
        totalEdits: improvementCount,
        deepInsights,
        taskProgress: completionRate,
        selfDriveScore,
        focusScore,
        thinkingScore,
        improvementScore,
        recentMilestones: [...newMilestones, ...prevMetrics.recentMilestones].slice(0, 5),
      };
    });
  }, [messages, improvementCount, completedTasksCount, totalTasks]);

  return (
    <div className="bg-gradient-to-b from-cyan-50 to-white p-4 rounded-2xl border border-cyan-100 shadow-lg h-full overflow-y-auto">
      <h3 className="text-cyan-800 font-bold mb-4 flex items-center gap-2 text-sm uppercase">
        <TrendingUp className="w-4 h-4" />
        实时学习进度
      </h3>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-cyan-700 font-medium">任务进度</span>
          <span className="text-xs text-cyan-600 font-bold">
            {totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0}%
          </span>
        </div>
        <div className="w-full bg-cyan-100 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-cyan-500 to-cyan-600 h-2 rounded-full transition-all duration-500"
            style={{
              width: `${totalTasks > 0 ? (completedTasksCount / totalTasks) * 100 : 0}%`,
            }}
          />
        </div>
        <p className="text-xs text-cyan-600 mt-1">
          任务 {currentTaskIndex + 1} / {totalTasks}
        </p>
      </div>

      <div className="mb-6 space-y-3">
        <h4 className="text-xs font-bold text-cyan-800 uppercase">学霸特质实时得分</h4>
        {[
          { name: '自驱力', score: metrics.selfDriveScore, bgColor: 'bg-purple-500' },
          { name: '专注力', score: metrics.focusScore, bgColor: 'bg-blue-500' },
          { name: '享受思考', score: metrics.thinkingScore, bgColor: 'bg-green-500' },
          { name: '痴迷改进', score: metrics.improvementScore, bgColor: 'bg-orange-500' },
        ].map((trait, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-700">{trait.name}</span>
              <span className="text-xs font-bold text-cyan-700">{Math.round(trait.score)}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div
                className={`${trait.bgColor} h-1.5 rounded-full transition-all duration-500`}
                style={{ width: `${trait.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="bg-white p-3 rounded-xl border border-cyan-200">
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="w-4 h-4 text-cyan-600" />
            <span className="text-xs text-slate-600">提问数</span>
          </div>
          <p className="text-2xl font-bold text-cyan-700">{metrics.totalQuestions}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-cyan-200">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-cyan-600" />
            <span className="text-xs text-slate-600">改进次数</span>
          </div>
          <p className="text-2xl font-bold text-cyan-700">{improvementCount}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-cyan-200">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-cyan-600" />
            <span className="text-xs text-slate-600">深度思考</span>
          </div>
          <p className="text-2xl font-bold text-cyan-700">{metrics.deepInsights}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-cyan-200">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-cyan-600" />
            <span className="text-xs text-slate-600">完成度</span>
          </div>
          <p className="text-2xl font-bold text-cyan-700">
            {Math.round((completedTasksCount / totalTasks) * 100)}%
          </p>
        </div>
      </div>

      {metrics.recentMilestones.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-cyan-800 uppercase mb-3">最近成就 ✨</h4>
          <div className="space-y-2">
            {metrics.recentMilestones.map((milestone) => (
              <div
                key={milestone.id}
                className="bg-gradient-to-r from-cyan-50 to-white p-2 rounded-lg border border-cyan-200 animate-fade-in"
              >
                <div className="flex items-start gap-2">
                  <div className="text-cyan-600 mt-0.5">{milestone.icon}</div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-700">{milestone.message}</p>
                    <p className="text-[10px] text-cyan-600 mt-0.5">+{milestone.points} 分</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
