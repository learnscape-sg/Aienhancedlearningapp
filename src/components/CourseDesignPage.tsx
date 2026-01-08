import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Upload, BookOpen, Save, Eye, Plus, Trash2, GripVertical } from 'lucide-react';
import { Badge } from './ui/badge';

export function CourseDesignPage() {
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [chapters, setChapters] = useState<Array<{ id: string; title: string; content: string }>>([]);

  const grades = ['初一', '初二', '初三', '高一', '高二', '高三'];
  const subjects = ['数学', '物理', '化学', '生物', '语文', '英语', '历史', '地理'];

  const addChapter = () => {
    const newChapter = {
      id: `chapter-${Date.now()}`,
      title: '',
      content: ''
    };
    setChapters([...chapters, newChapter]);
  };

  const removeChapter = (id: string) => {
    setChapters(chapters.filter(ch => ch.id !== id));
  };

  const updateChapter = (id: string, field: 'title' | 'content', value: string) => {
    setChapters(chapters.map(ch => 
      ch.id === id ? { ...ch, [field]: value } : ch
    ));
  };

  const handlePublish = () => {
    console.log('Publishing course:', {
      title: courseTitle,
      description: courseDescription,
      grade: selectedGrade,
      subject: selectedSubject,
      chapters
    });
    alert('课程已发布！');
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">课程设计</h1>
          <p className="text-muted-foreground mt-2">创建和编辑您的课程内容</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Eye className="w-4 h-4 mr-2" />
            预览
          </Button>
          <Button variant="outline">
            <Save className="w-4 h-4 mr-2" />
            保存草稿
          </Button>
          <Button onClick={handlePublish} className="bg-blue-600 hover:bg-blue-700">
            <BookOpen className="w-4 h-4 mr-2" />
            发布课程
          </Button>
        </div>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
          <CardDescription>填写课程的基本信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="course-title">课程名称 *</Label>
              <Input
                id="course-title"
                placeholder="例如：高中物理 - 牛顿定律"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade">年级 *</Label>
              <select
                id="grade"
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">选择年级</option>
                {grades.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subject">学科 *</Label>
              <select
                id="subject"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">选择学科</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>课程封面</Label>
              <Button variant="outline" className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                上传封面图片
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">课程描述</Label>
            <Textarea
              id="description"
              placeholder="简要介绍本课程的内容、目标和适用对象..."
              rows={4}
              value={courseDescription}
              onChange={(e) => setCourseDescription(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Learning Materials */}
      <Card>
        <CardHeader>
          <CardTitle>教学资源</CardTitle>
          <CardDescription>上传PDF、视频等教学资源，AI将自动转化为多种学习模式</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer">
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-sm font-medium mb-2">点击上传或拖拽文件至此</p>
            <p className="text-xs text-muted-foreground">支持 PDF, DOCX, PPT, MP4 等格式，最大 100MB</p>
            <Button variant="outline" className="mt-4">
              选择文件
            </Button>
          </div>
          
          {/* Uploaded files preview */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded flex items-center justify-center">
                  <span className="text-xs font-medium text-red-600">PDF</span>
                </div>
                <div>
                  <p className="text-sm font-medium">牛顿第三定律讲义.pdf</p>
                  <p className="text-xs text-muted-foreground">2.5 MB</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chapters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>章节内容</CardTitle>
              <CardDescription>组织您的课程章节和知识点</CardDescription>
            </div>
            <Button onClick={addChapter} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              添加章节
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {chapters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>暂无章节，点击上方按钮添加第一个章节</p>
            </div>
          ) : (
            chapters.map((chapter, index) => (
              <div key={chapter.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center space-x-3">
                  <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                  <Badge variant="secondary">第{index + 1}章</Badge>
                  <Input
                    placeholder="章节标题"
                    value={chapter.title}
                    onChange={(e) => updateChapter(chapter.id, 'title', e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => removeChapter(chapter.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
                <Textarea
                  placeholder="章节内容描述..."
                  rows={3}
                  value={chapter.content}
                  onChange={(e) => updateChapter(chapter.id, 'content', e.target.value)}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* AI Settings */}
      <Card>
        <CardHeader>
          <CardTitle>AI学习模式设置</CardTitle>
          <CardDescription>选择为此课程启用的AI学习模式</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { name: '沉浸式阅读', enabled: true },
              { name: '幻灯片讲解', enabled: true },
              { name: '音频课程', enabled: true },
              { name: '思维导图', enabled: true },
              { name: '互动游戏', enabled: false },
              { name: '视频学习', enabled: false },
            ].map((mode) => (
              <label key={mode.name} className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input 
                  type="checkbox" 
                  defaultChecked={mode.enabled}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm">{mode.name}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
