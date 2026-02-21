import React, { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { ArrowLeft, CheckCircle, Copy, ChevronUp, ChevronDown, ExternalLink, Eye, Rocket } from 'lucide-react';
import { Badge } from './ui/badge';
import { usePublishedCourses } from './PublishedCoursesContext';

interface TaskConfigurationPageProps {
  courseData?: any;
  designData?: any;
  documentData?: any;
  courseId?: string;
  onBack?: () => void;
  onPublish?: () => void;
}

interface Task {
  id: number;
  title: string;
  description: string;
  status: 'PENDING' | 'COMPLETED';
  materialType: string;
  materialColor: string;
  expanded?: boolean;
}

const getLearnYourWayOrigin = (): string => {
  const env = import.meta.env.VITE_LEARNYOURWAY_URL;
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
};

export function TaskConfigurationPage({ courseData, designData, documentData, courseId, onBack, onPublish }: TaskConfigurationPageProps) {
  const { addPublishedCourse } = usePublishedCourses();
  const courseUrl = courseId
    ? `${getLearnYourWayOrigin()}/course/${courseId}`
    : '';
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 1,
      title: '课前诊断与情境唤醒',
      description: '思考：当你的校车，车体突然停车，你若持身体会发生什么变化吗？你能发身体力量感觉吗？试借描述生活实践。',
      status: 'PENDING',
      materialType: 'AI 智能画廊 (GALLERY)',
      materialColor: 'purple'
    },
    {
      id: 2,
      title: '核心任务：知识精研',
      description: '阅读教材，把握重点：一定要理解惯性的定义概念，开采进正式对学。',
      status: 'PENDING',
      materialType: '交互式练习 (TABLE)',
      materialColor: 'orange'
    },
    {
      id: 3,
      title: '深度探究：伽利略的理想实验',
      description: '通过图解+互动模拟，让学生不需刻意按照书上的步骤进理想、思考：如果摩擦力完全消失，为什么会有所去在哪里？为什么数据未达标在此处？',
      status: 'PENDING',
      materialType: '互动实验 (EXPERIMENT)',
      materialColor: 'blue'
    },
    {
      id: 4,
      title: '自主任务：生活中的物理应用',
      description: '作为小主全科学讨论深，通过设计验复斥被斥全态带守其中一个意思，用牛顿第一定律感觉真讨过度一般约100字的打自然解释话。',
      status: 'COMPLETED',
      materialType: '文本与内嵌编辑 (TEXT EDITOR)',
      materialColor: 'green'
    },
    {
      id: 5,
      title: '总结与反思',
      description: '把这主要内容与成效表，直流总分为当堂课的今夫，开记录你所未来的收获总结。',
      status: 'PENDING',
      materialType: '思维导图编辑器 (MINDMAP)',
      materialColor: 'pink'
    }
  ]);

  const [showSuccess, setShowSuccess] = useState(false);

  const toggleTask = (id: number) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, expanded: !task.expanded } : task
    ));
  };

  const handlePublish = () => {
    // Add course to published courses
    if (courseData) {
      addPublishedCourse({
        subject: courseData.subject || '未命名学科',
        grade: courseData.grade || '未指定',
        topic: courseData.topic || '未命名课题',
        textbook: courseData.textbook || '未指定',
        hours: courseData.hours || '1',
        status: 'published',
        assignmentStatus: 'unassigned',
        visibilityStatus: 'private',
        shareStatus: 'none',
        students: 0,
        completion: 0,
        lastUpdated: '刚刚'
      });
    }
    
    setShowSuccess(true);
    setTimeout(() => {
      if (onPublish) {
        onPublish();
      }
    }, 2000);
  };

  const copyUrl = () => {
    if (!courseUrl) {
      alert('请先保存课程以获取学生链接');
      return;
    }
    navigator.clipboard.writeText(courseUrl);
    alert('链接已复制到剪贴板！');
  };

  const getMaterialBadgeClass = (color: string) => {
    const colorClasses: Record<string, string> = {
      purple: 'bg-primary/10 text-primary border-primary/30',
      orange: 'bg-accent/10 text-accent-foreground border-accent/30',
      blue: 'bg-secondary/10 text-secondary-foreground border-secondary/30',
      green: 'bg-primary/10 text-primary border-primary/30',
      pink: 'bg-accent/10 text-accent-foreground border-accent/30'
    };
    return colorClasses[color] || 'bg-muted text-muted-foreground border-border';
  };

  return (
    <div className="min-h-screen bg-muted">
      {/* Header with Title */}
      <div className="bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <h1 className="text-2xl font-bold text-center text-foreground">自学任务教师控制台 (v0.5)</h1>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <div className="w-40 h-1 bg-primary rounded-full"></div>
              <div className="w-40 h-1 bg-primary rounded-full"></div>
              <div className="w-40 h-1 bg-primary rounded-full"></div>
              <div className="w-40 h-1 bg-primary rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-8">
        <Card className="shadow-lg">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <span className="text-primary text-xl">{'<>'}</span>
                <h2 className="text-lg font-semibold text-foreground">4. 系统任务配置 & 素材工坊 (v0.5)</h2>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="outline" size="sm" className="text-primary border-primary">
                  一键生成所有素材
                </Button>
                <Button variant="outline" size="sm">
                  + 添加任务
                </Button>
              </div>
            </div>

            {/* Task List */}
            <div className="space-y-3">
              {tasks.map((task) => (
                <div 
                key={task.id}
                className="border border-border rounded-lg bg-background hover:shadow-md transition-shadow"
              >
                  <div className="p-4 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start space-x-3">
                        <span className="text-muted-foreground font-medium">{task.id}</span>
                        <div className="flex-1">
                          <h3 className="font-medium text-foreground mb-2">{task.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{task.description}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 ml-4">
                      <Badge 
                        variant="secondary" 
                        className={`${task.status === 'PENDING' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'} border border-border`}
                      >
                        {task.status}
                      </Badge>
                      <Badge 
                        variant="secondary" 
                        className={`${getMaterialBadgeClass(task.materialColor)} border font-normal`}
                      >
                        {task.materialType}
                      </Badge>
                      <div className="flex flex-col space-y-1">
                        <button className="text-muted-foreground hover:text-foreground">
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => toggleTask(task.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded content can be added here if needed */}
                  {task.expanded && (
                    <div className="px-4 pb-4 border-t border-border bg-muted">
                      <div className="pt-4">
                        <p className="text-sm text-muted-foreground">任务详细配置和素材编辑区域...</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Success Message */}
        {showSuccess && (
          <Card className="mt-6 bg-primary/10 border-primary/30 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-6 h-6 text-primary mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-2">课程已分配！</h3>
                  <div className="bg-background p-3 rounded border border-border mb-3">
                    <code className="text-sm text-foreground">
                      {courseUrl || '请先保存课程以获取学生链接'}
                    </code>
                  </div>
                  <p className="text-sm text-muted-foreground">将链接分享给学生，学生可以遵循设计的课程线。</p>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={copyUrl} size="sm">
                    <Copy className="w-4 h-4 mr-2" />
                    复制
                  </Button>
                  <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/10">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-6">
          <Button onClick={onBack} variant="outline" size="lg">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          {!showSuccess && (
            <div className="flex space-x-3">
              <Button variant="outline" size="lg">
                <Eye className="w-4 h-4 mr-2" />
                预览
              </Button>
              <Button onClick={handlePublish} size="lg" className="px-8">
                <Rocket className="w-4 h-4 mr-2" />
                发布
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}