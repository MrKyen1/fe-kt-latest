import { examDataMap } from '../data/mockData';
import { ExamData } from '../types';

export const examService = {
  async fetchExamData(examId: string): Promise<ExamData> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const exam = examDataMap[examId];
        if (!exam) {
          reject(new Error("Exam not found"));
        } else {
          resolve(exam);
        }
      }, 300);
    });
  }
};