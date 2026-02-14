import { supabase } from '../lib/supabase';

/**
 * Helper to get all active supervisor IDs for a given student.
 */
async function getSupervisorIds(studentId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('student_supervisor_relationships')
    .select('supervisor_id')
    .eq('student_id', studentId)
    .eq('status', 'active');

  if (error) {
    console.error('Failed to fetch supervisors for student:', studentId, error);
    return [];
  }

  return (data || []).map((row) => row.supervisor_id);
}

/**
 * Helper to get a student's display name from the profiles table.
 */
async function getStudentName(studentId: string): Promise<string> {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', studentId)
    .single();

  if (error || !data) {
    console.error('Failed to fetch student profile:', studentId, error);
    return 'A student';
  }

  return data.full_name || 'A student';
}

/**
 * Helper to create a notification row for a supervisor.
 */
async function createSupervisorNotification(
  supervisorId: string,
  type: string,
  message: string,
  actorId: string,
): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    user_id: supervisorId,
    type: type as any,
    message,
    actor_id: actorId,
    is_read: false,
  });

  if (error) {
    console.error('Failed to create supervisor notification:', error);
  }
}

/**
 * Notify supervisors when a student completes an exercise.
 */
export async function notifyExerciseCompletion(
  studentId: string,
  exerciseName: string,
  pathName: string,
): Promise<void> {
  try {
    const [supervisorIds, studentName] = await Promise.all([
      getSupervisorIds(studentId),
      getStudentName(studentId),
    ]);

    if (supervisorIds.length === 0) return;

    const message = `${studentName} completed the exercise "${exerciseName}" in ${pathName}`;

    await Promise.all(
      supervisorIds.map((supervisorId) =>
        createSupervisorNotification(supervisorId, 'exercise_completion', message, studentId),
      ),
    );
  } catch (error) {
    console.error('Error in notifyExerciseCompletion:', error);
  }
}

/**
 * Notify supervisors when a student records a route/driving session.
 */
export async function notifyRouteRecorded(
  studentId: string,
  routeName: string,
  durationMinutes: number,
): Promise<void> {
  try {
    const [supervisorIds, studentName] = await Promise.all([
      getSupervisorIds(studentId),
      getStudentName(studentId),
    ]);

    if (supervisorIds.length === 0) return;

    const message = `${studentName} recorded a driving session "${routeName}" (${durationMinutes} min)`;

    await Promise.all(
      supervisorIds.map((supervisorId) =>
        createSupervisorNotification(supervisorId, 'route_recorded', message, studentId),
      ),
    );
  } catch (error) {
    console.error('Error in notifyRouteRecorded:', error);
  }
}

/**
 * Check all students for inactivity and notify their supervisors.
 * Skips sending if a 'student_inactive' notification was already sent
 * for the same student within the last 7 days.
 */
export async function checkStudentInactivity(thresholdDays: number = 7): Promise<void> {
  try {
    // 1. Get all active student-supervisor relationships
    const { data: relationships, error: relError } = await supabase
      .from('student_supervisor_relationships')
      .select('student_id, supervisor_id')
      .eq('status', 'active');

    if (relError || !relationships || relationships.length === 0) {
      if (relError) console.error('Failed to fetch relationships:', relError);
      return;
    }

    // Group supervisors by student
    const studentSupervisors = new Map<string, string[]>();
    for (const rel of relationships) {
      const existing = studentSupervisors.get(rel.student_id) || [];
      existing.push(rel.supervisor_id);
      studentSupervisors.set(rel.student_id, existing);
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    for (const [studentId, supervisorIds] of studentSupervisors) {
      try {
        // 2. Check student's latest activity from daily_status
        const { data: latestActivity, error: activityError } = await supabase
          .from('daily_status')
          .select('created_at')
          .eq('user_id', studentId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (activityError && activityError.code !== 'PGRST116') {
          // PGRST116 = no rows found, which means the student has no activity at all
          console.error('Failed to fetch activity for student:', studentId, activityError);
          continue;
        }

        // If no activity found at all, or last activity is older than threshold
        const lastActivityDate = latestActivity?.created_at
          ? new Date(latestActivity.created_at)
          : null;

        const daysSinceActivity = lastActivityDate
          ? (now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
          : Infinity;

        if (daysSinceActivity <= thresholdDays) continue;

        // 3. Check for duplicate notification in last 7 days
        const { data: existingNotif } = await supabase
          .from('notifications')
          .select('id')
          .eq('actor_id', studentId)
          .eq('type', 'student_inactive' as any)
          .gte('created_at', sevenDaysAgo)
          .limit(1);

        if (existingNotif && existingNotif.length > 0) continue;

        // 4. Send notification to all supervisors of this student
        const studentName = await getStudentName(studentId);
        const daysInactive = lastActivityDate ? Math.floor(daysSinceActivity) : undefined;
        const message = daysInactive
          ? `${studentName} has been inactive for ${daysInactive} days`
          : `${studentName} has no recorded activity yet`;

        await Promise.all(
          supervisorIds.map((supervisorId) =>
            createSupervisorNotification(supervisorId, 'student_inactive', message, studentId),
          ),
        );
      } catch (innerError) {
        console.error('Error checking inactivity for student:', studentId, innerError);
      }
    }
  } catch (error) {
    console.error('Error in checkStudentInactivity:', error);
  }
}

/**
 * Notify supervisors when a student reaches a milestone.
 */
export async function notifyMilestone(studentId: string, milestone: string): Promise<void> {
  try {
    const [supervisorIds, studentName] = await Promise.all([
      getSupervisorIds(studentId),
      getStudentName(studentId),
    ]);

    if (supervisorIds.length === 0) return;

    const message = `${studentName} reached a milestone: ${milestone}`;

    await Promise.all(
      supervisorIds.map((supervisorId) =>
        createSupervisorNotification(supervisorId, 'student_milestone', message, studentId),
      ),
    );
  } catch (error) {
    console.error('Error in notifyMilestone:', error);
  }
}
