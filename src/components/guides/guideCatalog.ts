export type GuideLanguage = 'zh' | 'en';

export interface GuideText {
  zh: string;
  en: string;
}

export interface GuideStep {
  id: string;
  targetId: string;
  title: GuideText;
  description: GuideText;
}

export interface GuideTour {
  id: string;
  role: 'teacher' | 'student' | 'parent';
  page: string;
  version: string;
  steps: GuideStep[];
}

export interface FirstClickHintDefinition {
  id: string;
  title: GuideText;
  description: GuideText;
}

export const guideCatalog: Record<string, GuideTour> = {
  teacherDashboardV1: {
    id: 'teacher.dashboard.v1',
    role: 'teacher',
    page: 'dashboard',
    version: 'v1',
    steps: [
      {
        id: 'teacher.nav',
        targetId: 'teacher-sidebar-nav',
        title: {
          zh: '这里是教师工作台导航',
          en: 'This is your teacher workspace navigation',
        },
        description: {
          zh: '你可以在这里快速切换概览、课程设计、课程管理和班级管理。',
          en: 'Use this area to quickly switch between overview, course design, courses, and classes.',
        },
      },
      {
        id: 'teacher.settings',
        targetId: 'teacher-nav-settings',
        title: {
          zh: '建议先完成教师设置',
          en: 'Recommended: start with settings',
        },
        description: {
          zh: '建议先设置默认年级/科目，创建任务和课程时可自动预填；也可以在这里了解数字分身功能。',
          en: 'Set default grade/subject first for auto-fill in task and course creation, and explore Digital Twin here.',
        },
      },
      {
        id: 'teacher.classes',
        targetId: 'teacher-nav-classes',
        title: {
          zh: '最后管理你的班级',
          en: 'Then manage your classes',
        },
        description: {
          zh: '进入班级管理后可创建班级、添加学生并组织学习任务。',
          en: 'In class management, you can create classes, add students, and organize learning tasks.',
        },
      },
      {
        id: 'teacher.materials',
        targetId: 'teacher-nav-materials',
        title: {
          zh: '任务设计',
          en: 'Task design',
        },
        description: {
          zh: '这里用于设计任务内容和素材，沉淀可复用的任务资源。',
          en: 'Design task content and materials here to build reusable task assets.',
        },
      },
      {
        id: 'teacher.courseDesign',
        targetId: 'teacher-nav-course-design',
        title: {
          zh: '课程设计',
          en: 'Course design',
        },
        description: {
          zh: '通过 AI 一次性生成多任务课程，实现一键备整堂课；创建后可在课程管理中持续编辑，分发到班级，并共享给其他老师复用。',
          en: 'Use AI to generate a multi-task course in one go. After creation, continue editing in course management, assign to classes, and share with other teachers.',
        },
      },
    ],
  },
};

export const firstClickHintCatalog: Record<string, FirstClickHintDefinition> = {
  teacherCourseDesignGenerate: {
    id: 'teacher.courseDesign.generate.v1',
    title: {
      zh: '开始生成前的小提示',
      en: 'A quick tip before generating',
    },
    description: {
      zh: '建议先确认学科、年级、课题已填写完整。生成过程可能需要几十秒到几分钟，请耐心等待。',
      en: 'Please confirm subject, grade, and topic are complete. Generation may take tens of seconds to a few minutes.',
    },
  },
  teacherCourseDesignCreateCourse: {
    id: 'teacher.courseDesign.createCourse.v1',
    title: {
      zh: '创建课程说明',
      en: 'Before creating the course',
    },
    description: {
      zh: '点击后会保存任务并创建课程链接，课程可以到课程管理中查看、编辑和分发。建议先检查任务预览内容再继续。',
      en: 'This saves tasks and creates a course link. You can review, edit, and distribute it from course management. Check task previews before continuing.',
    },
  },
  teacherClassAddExisting: {
    id: 'teacher.class.addExisting.v1',
    title: {
      zh: '从全校选班说明',
      en: 'About selecting classes from school',
    },
    description: {
      zh: '该功能会把你作为任课老师身份加入到已存在班级中，便于后续分配课程和任务，但你不能管理班级和删改班级成员。',
      en: 'This adds you to existing classes as a subject teacher so you can assign courses and tasks, but you cannot manage the class or modify members.',
    },
  },
  teacherClassCreateNew: {
    id: 'teacher.class.createNew.v1',
    title: {
      zh: '新建班级说明',
      en: 'About creating a class',
    },
    description: {
      zh: '新建的班级你是管理员，既可以分配课程和任务，也可以管理班级成员。',
      en: 'For newly created classes, you are the administrator and can assign courses/tasks and manage class members.',
    },
  },
  teacherClassCreateAccount: {
    id: 'teacher.class.createAccount.v1',
    title: {
      zh: '创建新账号说明',
      en: 'About creating new accounts',
    },
    description: {
      zh: '用于为当前班级创建学生账号并自动入班。建议使用统一命名规则，便于后续管理。',
      en: 'Create student accounts for the current class and enroll them automatically. Use consistent naming for easier management.',
    },
  },
  teacherClassSearchExistingAccount: {
    id: 'teacher.class.searchExistingAccount.v1',
    title: {
      zh: '搜索已有账号说明',
      en: 'About searching existing accounts',
    },
    description: {
      zh: '用于把已有学生账号加入当前班级，不会新建账号，也不会修改原账号信息。',
      en: 'Add existing student accounts to the current class. It does not create new accounts or alter original account info.',
    },
  },
};
