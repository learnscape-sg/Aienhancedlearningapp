import { supabase } from '../utils/supabase/client';

interface SaveCourseMetaParams {
  publicId: string;
  teacherId: string;
  subject: string;
  grade: string;
  topic: string;
  textbook?: string;
}

/**
 * 保存老师端课程元数据到 Supabase 的 course_plans 表。
 * 这里假设 self-learning-system 已经通过 /api/courses 写入了一行
 * （public_id + plan_json），我们在此基础上补充 teacher_id 和基础信息。
 */
export async function saveCourseMetaToSupabase({
  publicId,
  teacherId,
  subject,
  grade,
  topic,
  textbook,
}: SaveCourseMetaParams): Promise<void> {
  const trimmedSubject = subject.trim();
  const trimmedGrade = grade.trim();
  const trimmedTopic = topic.trim();
  const trimmedTextbook = textbook?.trim() || null;

  if (!publicId || !teacherId) {
    console.warn('[coursesRepository] Missing publicId or teacherId, skip saving meta.');
    return;
  }

  const { error } = await supabase
    .from('course_plans')
    .update({
      teacher_id: teacherId,
      subject: trimmedSubject || null,
      grade: trimmedGrade || null,
      topic: trimmedTopic || null,
      textbook: trimmedTextbook,
      updated_at: new Date().toISOString(),
    })
    .eq('public_id', publicId);

  if (error) {
    console.error('[coursesRepository] Failed to save course meta to Supabase:', error);
    throw new Error(error.message || '保存课程信息到 Supabase 失败');
  }
}

interface TeacherCourseRow {
  public_id: string;
  subject: string | null;
  grade: string | null;
  topic: string | null;
  textbook: string | null;
  status: string | null;
  students: number | null;
  completion: number | null;
  updated_at: string | null;
}

export async function listTeacherCourses(
  teacherId: string
): Promise<TeacherCourseRow[]> {
  if (!teacherId) return [];

  const { data, error } = await supabase
    .from('course_plans')
    .select(
      'public_id, subject, grade, topic, textbook, status, students, completion, updated_at'
    )
    .eq('teacher_id', teacherId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[coursesRepository] Failed to load teacher courses from Supabase:', error);
    return [];
  }

  return (data || []) as TeacherCourseRow[];
}

