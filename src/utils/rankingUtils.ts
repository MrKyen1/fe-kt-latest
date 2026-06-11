import { Student } from "../types";

/**
 * Calculate ranking score based on multiple performance metrics
 * @param student - Student object with performance data
 * @returns Ranking score (0-100)
 */
export function calculateRankingScore(student: Student): number {
  const correctAnswers = student.correctAnswers ?? 0;
  const totalExams = student.totalExams ?? 1; // Avoid division by zero
  const totalTimeSpent = student.totalTimeSpent ?? 0;

  // Score components (weighted)
  const accuracyScore = (correctAnswers / totalExams) * 40; // 40% weight
  const volumeScore = Math.min(totalExams / 20, 1) * 30; // 30% weight, max at 20 exams
  const efficiencyScore = Math.max(0, (1 - totalTimeSpent / 200)) * 30; // 30% weight, better with less time

  return Math.round((accuracyScore + volumeScore + efficiencyScore) * 10) / 10; // Round to 1 decimal
}

/**
 * Sort students by ranking score with tie breakers
 * @param students - Array of students to sort
 * @returns Sorted array of students
 */
export function sortStudentsByRanking(students: Student[]): Student[] {
  return [...students].sort((a, b) => {
    const scoreA = calculateRankingScore(a);
    const scoreB = calculateRankingScore(b);

    if (scoreA !== scoreB) {
      return scoreB - scoreA; // Higher score first
    }

    // Tie breakers
    const timeA = a.totalTimeSpent ?? 0;
    const timeB = b.totalTimeSpent ?? 0;
    if (timeA !== timeB) {
      return timeA - timeB; // Less time is better
    }

    const birthA = a.birthYear ?? 0;
    const birthB = b.birthYear ?? 0;
    return birthA - birthB;
  });
}

/**
 * Get student rank in a list
 * @param student - Target student
 * @param students - Array of all students
 * @returns Rank number (1-based) or null if not found
 */
export function getStudentRank(student: Student, students: Student[]): number | null {
  const sortedStudents = sortStudentsByRanking(students);
  const index = sortedStudents.findIndex(s => s.id === student.id);
  return index >= 0 ? index + 1 : null;
}