/**
 * profiles.preferences JSONB structure.
 * Students use: grade, interests, notifications (newCourseAssigned, deadlineReminder)
 * Teachers use: defaultGrade, defaultSubject, employeeType (在校职务), notifications
 */
export interface ProfilePreferences {
  grade?: string;
  interests?: string[];
  defaultGrade?: string;
  defaultSubject?: string;
  /** 在校职务，Excel 导入时从「在校职务」列写入 */
  employeeType?: string;
  /** 部门，Excel 导入时从「部门」列写入 */
  department?: string;
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
