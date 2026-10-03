# TÀI LIỆU YÊU CẦU & THIẾT KẾ BACKEND: THỐNG KÊ CHI TIẾT TỪNG HỌC SINH & GIẢI MÃ CÂU HỎI (TEACHER ASSIGNMENTS)

## 1. Mục tiêu (Objective)
Giáo viên khi giao bài thi hoặc giáo trình cần theo dõi chi tiết tình hình làm bài của **từng học sinh cụ thể**:
- Học sinh nào đã nộp, học sinh nào chưa làm, học sinh nào đang làm.
- Điểm số, tỷ lệ %, số lần làm, thời gian nộp bài của từng học sinh.
- Thống kê câu hỏi phải hiển thị rõ ràng Số thứ tự (Câu 1, Câu 2...), Tiêu đề/Nội dung câu hỏi (`prompt`), không được trả về mã UUID hex thô (`01a0962c...`).
- Cung cấp API cho giáo viên xem chi tiết bài làm của từng học sinh (học sinh chọn đáp án nào, câu nào đúng/sai, đáp án chính xác là gì).

---

## 2. Các vấn đề hiện tại trong Backend

### Vấn đề 1: Thống kê câu hỏi trong `GET /learning/teacher/exam-assignments/:id/analytics`
- **Hiện tại:** Trong `TeacherExamAssignmentsService.analytics`, bảng `ExamAttemptAnswer` được gom nhóm theo `answer.questionId` và chỉ trả về:
  ```json
  {
    "questionId": "01a0962c-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "total": 2,
    "correct": 1,
    "correctnessRate": 50
  }
  ```
- **Hậu quả:** Frontend không có thông tin tiêu đề/nội dung câu hỏi hoặc số thứ tự, chỉ hiển thị được UUID bị cắt `01a0962c...` (người dùng nhìn vào tưởng câu hỏi bị mã hoá).
- **Giải pháp:** Bảng `ExamAttemptAnswer` đã có sẵn các trường:
  - `orderIndex`: số thứ tự câu trong đề thi (0, 1, 2...)
  - `questionSnapshot`: JSONB chứa `prompt`, `type`, `options`, ...
  - `questionType`: loại câu hỏi
  Backend chỉ cần trích xuất `orderIndex`, `prompt` từ `questionSnapshot` (hoặc join với `Question`) để trả về cho Frontend.

### Vấn đề 2: Thiếu danh sách thống kê từng học sinh trong `analytics`
- **Hiện tại:** `analytics` chỉ trả về các con số tổng hợp: `assignedCount`, `submittedCount`, `averageScore`, `bestScore`... Hoàn toàn không có dữ liệu chi tiết của từng học sinh (`students`).
- **Giải pháp:** Bổ sung trường `students: [...]` vào response của `analytics`, tổng hợp thông tin từng học sinh được giao và trạng thái nộp bài.

### Vấn đề 3: Chưa có API cho giáo viên xem chi tiết bài làm (`attempt detail`) của học sinh
- **Hiện tại:** Chỉ học sinh mới có API `GET /learning/student/attempts/:id` để xem bài của chính mình. Nếu giáo viên gọi API này sẽ bị chặn quyền (Forbidden/NotFound). Giáo viên chỉ có `GET /learning/teacher/exam-assignments/:id/attempts` nhưng API này chỉ trả về summary (không có mảng `answers` câu trả lời chi tiết).
- **Giải pháp:** Thêm API:
  `GET /learning/teacher/exam-assignments/:assignmentId/attempts/:attemptId`

---

## 3. Đặc tả chi tiết các API cần cập nhật / thêm mới

### 3.1. Cập nhật: `GET /learning/teacher/exam-assignments/:id/analytics`

#### Response Schema đề xuất:
```typescript
interface ExamAssignmentAnalyticsResponse {
  data: {
    assignedCount: number;
    submittedCount: number;
    notStartedCount: number;
    inProgressCount: number;
    finishedCount: number;
    attemptsCount: number;
    averageScore: number;
    bestScore: number;
    averagePercentage: number;
    bestPercentage: number;
    scoreDistribution: Record<string, number>;
    // 1. NÂNG CẤP: Thông tin câu hỏi chi tiết
    perQuestion: Array<{
      questionId: string;
      orderIndex: number;          // Vị trí câu (0, 1, 2...) -> FE hiển thị Câu 1, Câu 2...
      prompt: string;              // Nội dung/tiêu đề câu hỏi lấy từ questionSnapshot.prompt
      questionType?: string;       // single_choice, multiple_choice, fill_in_blank...
      total: number;
      correct: number;
      correctnessRate: number;
    }>;
    // 2. NÂNG CẤP: Danh sách kết quả từng học sinh
    students: Array<{
      studentId: string;
      assignmentStudentId?: string;
      code?: string;               // Mã học sinh
      fullName: string;            // Họ và tên học sinh
      email?: string;
      status: "assigned" | "in_progress" | "finished" | "submitted";
      attemptsCount: number;       // Số lần học sinh đã làm
      latestScore?: number;        // Điểm số lần gần nhất
      maxScore?: number;           // Thang điểm tối đa
      latestPercentage?: number;   // % điểm lần gần nhất
      bestScore?: number;          // Điểm cao nhất
      bestPercentage?: number;     // % điểm cao nhất
      submittedAt?: string | null; // Thời gian nộp bài lần gần nhất
      durationSeconds?: number | null; // Thời gian làm bài (giây)
      latestAttemptId?: string | null; // ID của attempt gần nhất để xem chi tiết
    }>;
  };
}
```

#### Code gợi ý trong `TeacherExamAssignmentsService.analytics`:
```typescript
async analytics(user: RequestUser, id: string) {
  const assignment = await this.loadAssignment(id);
  await this.ensureCanAccessAssignment(user, assignment);

  const students = assignment.students ?? [];
  const assignedCount = students.length;
  const notStartedCount = students.filter(
    (s) => s.status === ExamAssignmentStudentStatus.ASSIGNED,
  ).length;
  const inProgressCount = students.filter(
    (s) => s.status === ExamAssignmentStudentStatus.IN_PROGRESS,
  ).length;
  const finishedCount = students.filter(
    (s) => s.status === ExamAssignmentStudentStatus.FINISHED,
  ).length;

  const attempts = await this.dataSource
    .getRepository(ExamAttempt)
    .createQueryBuilder('attempt')
    .leftJoinAndSelect('attempt.student', 'student')
    .leftJoinAndSelect('student.user', 'studentUser')
    .where('attempt.assignment_id = :assignmentId', { assignmentId: id })
    .orderBy('attempt.submitted_at', 'DESC')
    .addOrderBy('attempt.created_at', 'DESC')
    .getMany();

  const submittedAttempts = attempts.filter(
    (a) => a.status === ExamAttemptStatus.SUBMITTED,
  );
  const submittedStudentIds = new Set(submittedAttempts.map((a) => a.studentId));
  const officialAttempts = submittedAttempts.filter((a) => a.attemptNumber === 1);
  const scores = officialAttempts.map((a) => Number(a.score));
  const percentages = officialAttempts.map((a) => Number(a.percentage));

  // --- 1. perQuestion với prompt và orderIndex ---
  const answerRows = await this.dataSource
    .getRepository(ExamAttemptAnswer)
    .createQueryBuilder('answer')
    .innerJoin('answer.attempt', 'attempt')
    .where('attempt.assignment_id = :assignmentId', { assignmentId: id })
    .andWhere('attempt.status = :status', { status: ExamAttemptStatus.SUBMITTED })
    .andWhere('attempt.attempt_number = 1')
    .getMany();

  const perQuestionMap = new Map<string, {
    questionId: string;
    orderIndex: number;
    prompt: string;
    questionType: string;
    total: number;
    correct: number;
  }>();

  for (const answer of answerRows) {
    const prompt = (answer.questionSnapshot as any)?.prompt ?? `Câu hỏi ${(answer.orderIndex ?? 0) + 1}`;
    const existing = perQuestionMap.get(answer.questionId) ?? {
      questionId: answer.questionId,
      orderIndex: answer.orderIndex ?? 0,
      prompt,
      questionType: answer.questionType,
      total: 0,
      correct: 0,
    };
    existing.total += 1;
    if (answer.isCorrect) existing.correct += 1;
    perQuestionMap.set(answer.questionId, existing);
  }

  const perQuestion = [...perQuestionMap.values()]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((item) => ({
      ...item,
      correctnessRate: item.total
        ? Number(((item.correct / item.total) * 100).toFixed(2))
        : 0,
    }));

  // --- 2. Thống kê theo từng học sinh ---
  const attemptsByStudent = new Map<string, ExamAttempt[]>();
  for (const attempt of attempts) {
    const list = attemptsByStudent.get(attempt.studentId) ?? [];
    list.push(attempt);
    attemptsByStudent.set(attempt.studentId, list);
  }

  const studentStats = students.map((assignStudent) => {
    const sId = assignStudent.studentId;
    const user = assignStudent.student?.user;
    const sAttempts = attemptsByStudent.get(sId) ?? [];
    const submittedList = sAttempts.filter((a) => a.status === ExamAttemptStatus.SUBMITTED);
    const latestAttempt = submittedList[0] || sAttempts[0];

    const scoreVals = submittedList.map((a) => Number(a.score));
    const pctVals = submittedList.map((a) => Number(a.percentage));
    const bestScore = scoreVals.length ? Math.max(...scoreVals) : null;
    const bestPercentage = pctVals.length ? Math.max(...pctVals) : null;

    let computedStatus = assignStudent.status as string;
    if (submittedList.length > 0) {
      computedStatus = 'submitted';
    } else if (sAttempts.some((a) => a.status === ExamAttemptStatus.IN_PROGRESS)) {
      computedStatus = 'in_progress';
    }

    return {
      studentId: sId,
      assignmentStudentId: assignStudent.id,
      code: user?.code,
      fullName: user?.fullName || 'Học sinh',
      email: user?.email,
      status: computedStatus,
      attemptsCount: sAttempts.length,
      latestScore: latestAttempt?.score != null ? Number(latestAttempt.score) : null,
      maxScore: latestAttempt?.maxScore != null ? Number(latestAttempt.maxScore) : null,
      latestPercentage: latestAttempt?.percentage != null ? Number(latestAttempt.percentage) : null,
      bestScore,
      bestPercentage,
      submittedAt: latestAttempt?.submittedAt || null,
      durationSeconds: latestAttempt?.durationSeconds || null,
      latestAttemptId: latestAttempt?.id || null,
    };
  });

  return {
    data: {
      assignedCount,
      notStartedCount,
      inProgressCount,
      finishedCount,
      submittedCount: submittedStudentIds.size,
      attemptsCount: submittedAttempts.length,
      averageScore: this.average(scores),
      bestScore: scores.length ? Math.max(...scores) : 0,
      averagePercentage: this.average(percentages),
      bestPercentage: percentages.length ? Math.max(...percentages) : 0,
      scoreDistribution: this.scoreDistribution(percentages),
      perQuestion,
      students: studentStats,
    },
  };
}
```

---

### 3.2. Thêm mới: `GET /learning/teacher/exam-assignments/:assignmentId/attempts/:attemptId`

Mục đích: Cho phép giáo viên xem chi tiết bài nộp của học sinh (từng câu hỏi, đáp án học sinh chọn, đáp án đúng, điểm số).

#### Controller (`TeacherLearningController`):
```typescript
@Get('exam-assignments/:assignmentId/attempts/:attemptId')
findAssignmentAttemptDetail(
  @CurrentUser() user: RequestUser,
  @Param('assignmentId') assignmentId: string,
  @Param('attemptId') attemptId: string,
) {
  return this.teacherAssignmentsService.findAttemptDetail(user, assignmentId, attemptId);
}
```

#### Service (`TeacherExamAssignmentsService.findAttemptDetail`):
```typescript
async findAttemptDetail(user: RequestUser, assignmentId: string, attemptId: string) {
  const assignment = await this.loadAssignment(assignmentId);
  await this.ensureCanAccessAssignment(user, assignment);

  const attempt = await this.dataSource.getRepository(ExamAttempt).findOne({
    where: { id: attemptId, assignmentId },
    relations: {
      student: { user: true },
      answers: true,
    },
    order: { answers: { orderIndex: 'ASC' } },
  });

  if (!attempt) {
    throw new NotFoundException('Không tìm thấy lượt làm bài này');
  }

  const answers = attempt.answers ?? [];
  return {
    data: {
      id: attempt.id,
      assignmentId: attempt.assignmentId,
      studentId: attempt.studentId,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentage: attempt.percentage,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      durationSeconds: attempt.durationSeconds,
      student: attempt.student ? {
        id: attempt.student.id,
        user: attempt.student.user ? {
          id: attempt.student.user.id,
          code: attempt.student.user.code,
          fullName: attempt.student.user.fullName,
          email: attempt.student.user.email,
        } : undefined,
      } : undefined,
      answers: answers.map((answer) => ({
        id: answer.id,
        questionId: answer.questionId,
        orderIndex: answer.orderIndex,
        questionType: answer.questionType,
        questionSnapshot: answer.questionSnapshot,
        studentAnswer: answer.answer,
        correctAnswer: answer.correctAnswer,
        score: answer.score,
        maxScore: answer.maxScore,
        isCorrect: answer.isCorrect,
        feedback: answer.feedback,
        answeredAt: answer.answeredAt,
      })),
    },
  };
}
```

---

### 3.3. Cập nhật: `GET /learning/teacher/curriculum-assignments/:id/analytics`
- Tương tự như bài thi, trong `TeacherCurriculumAssignmentsService.analytics`, bổ sung mảng `students` vào response:
  ```json
  "students": [
    {
      "studentId": "...",
      "code": "HS001",
      "fullName": "Nguyễn Văn A",
      "email": "a@kata.edu.vn",
      "status": "in_progress",
      "progressPercentage": 60,
      "finishedExamsCount": 3,
      "totalRequiredExamsCount": 5,
      "finishedAt": null
    }
  ]
  ```

---

## 4. Tóm tắt checklist cho Backend Developer
- [ ] Cập nhật `TeacherExamAssignmentsService.analytics`:
  - [ ] Thêm `orderIndex`, `prompt`, `questionType` vào mảng `perQuestion`.
  - [ ] Thêm mảng `students` (thống kê điểm, trạng thái, thời gian nộp của từng học sinh).
- [ ] Thêm API `GET /learning/teacher/exam-assignments/:assignmentId/attempts/:attemptId`:
  - [ ] Thêm route trong `TeacherLearningController`.
  - [ ] Viết hàm `findAttemptDetail` trong `TeacherExamAssignmentsService`.
- [ ] Cập nhật `TeacherCurriculumAssignmentsService.analytics` bổ sung mảng `students` tiến độ.
