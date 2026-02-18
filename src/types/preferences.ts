/**
 * profiles.preferences JSONB structure.
 * Students use: grade, interests, notifications (newCourseAssigned, deadlineReminder)
 * Teachers use: defaultGrade, defaultSubject, notifications (studentJoinedClass, taskSubmission)
 */
export interface ProfilePreferences {
  grade?: string;
  interests?: string[];
  defaultGrade?: string;
  defaultSubject?: string;
  notifications?: {
    studentJoinedClass?: boolean;
    taskSubmission?: boolean;
    newCourseAssigned?: boolean;
    deadlineReminder?: boolean;
  };
}

export const defaultNotifications = {
  studentJoinedClass: true,
  taskSubmission: false,
  newCourseAssigned: true,
  deadlineReminder: false,
};
