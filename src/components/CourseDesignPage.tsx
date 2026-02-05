import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Upload, BookOpen, Save, Eye, Trash2, Target, Layers } from 'lucide-react';

interface CourseDesignPageProps {
  onNextStep?: (courseData: any) => void;
}

export function CourseDesignPage({ onNextStep }: CourseDesignPageProps) {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [courseTopic, setCourseTopic] = useState('');
  const [textbookVersion, setTextbookVersion] = useState('');
  const [lessonHours, setLessonHours] = useState('1');

  const subjects = ['数学', '物理', '化学', '生物', '语文', '英语', '历史', '地理'];
  const grades = ['初一', '初二', '初三', '高一', '高二', '高三'];

  const handleAnalyzeStandards = () => {
    const courseData = {
      subject: selectedSubject,
      grade: selectedGrade,
      topic: courseTopic,
      textbook: textbookVersion,
      hours: lessonHours
    };
    
    if (onNextStep) {
      onNextStep(courseData);
    }
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
          <Button className="bg-blue-600 hover:bg-blue-700">
            <BookOpen className="w-4 h-4 mr-2" />
            发布课程
          </Button>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className="w-40 h-1 bg-cyan-600 rounded-full"></div>
            <div className="w-3 h-3 bg-cyan-600 rounded-full -ml-1.5"></div>
          </div>
          <div className="flex items-center">
            <div className="w-40 h-1 bg-gray-200 rounded-full"></div>
            <div className="w-3 h-3 bg-gray-200 rounded-full -ml-1.5"></div>
          </div>
          <div className="flex items-center">
            <div className="w-40 h-1 bg-gray-200 rounded-full"></div>
            <div className="w-3 h-3 bg-gray-200 rounded-full -ml-1.5"></div>
          </div>
          <div className="flex items-center">
            <div className="w-40 h-1 bg-gray-200 rounded-full"></div>
            <div className="w-3 h-3 bg-gray-200 rounded-full -ml-1.5"></div>
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-cyan-600" />
            <CardTitle className="text-lg">1. 基础信息设定</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm text-gray-600">学科</Label>
              <Input
                id="subject"
                placeholder="物理"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade" className="text-sm text-gray-600">年级</Label>
              <Input
                id="grade"
                placeholder="八年级"
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="h-12"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic" className="text-sm text-gray-600">课题</Label>
            <Input
              id="topic"
              placeholder="牛顿第一定律"
              value={courseTopic}
              onChange={(e) => setCourseTopic(e.target.value)}
              className="h-12"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="textbook" className="text-sm text-gray-600">
                教材版本 <span className="text-gray-400">(德制四配)</span>
              </Label>
              <Input
                id="textbook"
                placeholder="统编版"
                value={textbookVersion}
                onChange={(e) => setTextbookVersion(e.target.value)}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours" className="text-sm text-gray-600">课时</Label>
              <select
                id="hours"
                value={lessonHours}
                onChange={(e) => setLessonHours(e.target.value)}
                className="w-full h-12 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
              >
                <option value="1">1 课时</option>
                <option value="2">2 课时</option>
                <option value="3">3 课时</option>
                <option value="4">4 课时</option>
                <option value="5">5 课时</option>
              </select>
            </div>
          </div>

          <div className="pt-4">
            <Button 
              onClick={handleAnalyzeStandards}
              className="w-full h-12 bg-cyan-600 hover:bg-cyan-700 text-white text-base font-medium"
            >
              <Target className="w-5 h-5 mr-2" />
              分析课程标准 & 设计目标
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}