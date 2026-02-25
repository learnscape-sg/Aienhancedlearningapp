# 未使用 / 隔离的页面组件

本目录存放暂时未接入导航的页面组件，保留供后续参考或恢复使用。

## 文件列表

| 文件 | 说明 |
|------|------|
| CoreDesignPage.tsx | 核心设计页（大概念、学习目标等），原不可达链路 |
| TeachingDocumentPage.tsx | 教学文档页，原不可达链路 |
| TaskConfigurationPage.tsx | 任务配置与发布页，原不可达链路 |
| CourseDesignPage.tsx | 课程设计页（表单式） |
| TaskManagementPage.tsx | 任务管理页（功能已并入 CourseManagementPage） |
| CoursesPage.tsx | 课程列表页 |
| ChapterPage.tsx | 章节页（已被 EnhancedChapterPage 替代） |
| QuizInterfacePage.tsx | 测验界面页 |

## 恢复方式

如需恢复某个页面：

1. 将对应 `.tsx` 文件移回 `src/components/`
2. 在 `App.tsx` 中添加 import 及渲染逻辑
3. 如有依赖其他隔离文件，一并移回
