import { ExamData } from '../types';

/* ===================== COURSES ===================== */

export const coursesData = [
  {
    id: 'toan',
    title: 'Toán',
    subCourses: [
      { id: 'toan-1-5', title: 'Toán Lớp 1-5', image: 'https://picsum.photos/seed/toan1/400/300' },
      { id: 'toan-6-9', title: 'Toán Lớp 6-9', image: 'https://picsum.photos/seed/toan2/400/300' },
      { id: 'toan-10-12', title: 'Toán Lớp 10-12', image: 'https://picsum.photos/seed/toan3/400/300' },
      { id: 'toan-chuyen', title: 'Ôn thi vào trường chuyên cấp 2,3, đại học', image: 'https://picsum.photos/seed/toan4/400/300' }
    ]
  },
  {
    id: 'tieng-anh',
    title: 'Tiếng Anh',
    subCourses: [
      { id: 'ta-sgk', title: 'Tiếng Anh theo SGK', image: 'https://picsum.photos/seed/ta1/400/300' },
      { id: 'ta-giao-tiep', title: 'Tiếng Anh giao tiếp', image: 'https://picsum.photos/seed/ta2/400/300' },
      { id: 'ta-chuyen', title: 'Luyện thi chuyên 2-3, đại học', image: 'https://picsum.photos/seed/ta3/400/300' },
      { id: 'ta-ielts', title: 'IELTS', image: 'https://picsum.photos/seed/ta4/400/300' },
      { id: 'ta-vao-10', title: 'Luyện thi vào 10', image: 'https://picsum.photos/seed/ta5/400/300' }
    ]
  }
];

/* ===================== TEACHERS ===================== */

export const teachersData = [
  { id: 1, name: 'Cô Nguyễn Thị A', subject: 'Toán', image: 'https://picsum.photos/seed/teacher1/200/200', desc: '10 năm kinh nghiệm luyện thi' },
  { id: 2, name: 'Thầy Trần Văn B', subject: 'Tiếng Anh', image: 'https://picsum.photos/seed/teacher2/200/200', desc: 'IELTS 8.5, chuyên gia giao tiếp' }
];

/* ===================== EXAMS (METADATA) ===================== */
/**
 * Dùng cho danh sách đề thi (list view)
 * KHÔNG chứa câu hỏi
 */

export const examsData = {
  'ta-sgk': [
    {
      id: 'exam-ta6',
      title: 'Đề kiểm tra Tiếng Anh Lớp 6 - Giữa kì 1',
      timeLimit: 2700
    }
  ],
  'ta-vao-10': [
    {
      id: 'exam_kata_01',
      title: 'Bài kiểm tra số 1 - Ngữ pháp & Nghe',
      timeLimit: 1800
    }
  ]
};

/* ===================== FULL EXAM DATA ===================== */
/**
 * Map examId → ExamData
 * Dùng khi làm bài
 */

export const examDataMap: Record<string, ExamData> = {
  'exam_kata_01': {
    id: 'exam_kata_01',
    title: 'Bài kiểm tra số 1 - Ngữ pháp & Nghe',
    timeLimit: 1800,
    questions: [
    {
      id: 'q1',
      type: 'multiple-choice',
      questionContent: 'Choose the correct word to complete the sentence:\n"She _____ to the store every morning."',
      options: ['go', 'goes', 'going', 'gone'],
      correctAnswer: 'goes',
      explanation: 'Với chủ ngữ là ngôi thứ 3 số ít "She" và thì hiện tại đơn (dấu hiệu: "every morning"), động từ "go" phải thêm "es" thành "goes".'
    },
    {
      id: 'q2',
      type: 'listening',
      questionContent: 'Listen to the audio and select the fruit the speaker is talking about.',
      media: {
        type: 'audio',
        url: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg' // Mock audio url
      },
      options: ['Apple', 'Banana', 'Orange', 'Mango'],
      correctAnswer: 'Apple',
      explanation: 'Trong đoạn băng, người nói nhắc đến "A red fruit that keeps the doctor away", ám chỉ quả táo (Apple).'
    },
    {
      id: 'q3',
      type: 'word-ordering',
      questionContent: 'Sắp xếp các từ sau thành câu hoàn chỉnh:',
      options: ['playing', 'is', 'He', 'football', 'now'],
      correctAnswer: ['He', 'is', 'playing', 'football', 'now'],
      explanation: 'Đây là câu thì hiện tại tiếp diễn. Cấu trúc đúng là: Chủ ngữ (He) + to be (is) + V-ing (playing) + Tân ngữ (football) + Trạng từ thời gian (now).'
    },
    {
      id: 'q4',
      type: 'multiple-choice',
      passage: 'NAUGHTY BILLY\nBilly lives in a flat in the city with her family. Last Saturday was a very hot day and her family decided to stay at home. Billy didn\'t have anyone to play with. She asked her dad, but he had to wash the car. She didn\'t ask her mum, because she was in the living room with one of her friends. Billy thought, "Perhaps Jane will play with me." But her elder sister was doing her homework. Billy went downstairs to the kitchen. She took three things out of the fridge: the milk, a bottle of orange juice and some lemonade. It was difficult to choose, so Billy put all three of them in one glass. Then she took it upstairs and put it down on Jane\'s desk. Jane picked up the drink and tasted it. "Oh no, Billy!" she laughed, "This is horrible!". "Hahaha. Come here and play with me." said Billy.',
      questionContent: 'Why didn\'t Billy ask her mother to play with her?',
      options: [
        'A. Because her mother was watching TV.',
        'B. Because her mother was washing the car.',
        'C. Because her mother was not at home.',
        'D. Because her mother was in the living room with her friend.'
      ],
      correctAnswer: 'D. Because her mother was in the living room with her friend.',
      explanation: 'Trong bài có câu: "She didn’t ask her mum, because she was in the living room with one of her friends."'
    },
    {
      id: 'q5',
      type: 'multiple-choice',
      passage: 'NAUGHTY BILLY\nBilly lives in a flat in the city with her family. Last Saturday was a very hot day and her family decided to stay at home. Billy didn\'t have anyone to play with. She asked her dad, but he had to wash the car. She didn\'t ask her mum, because she was in the living room with one of her friends. Billy thought, "Perhaps Jane will play with me." But her elder sister was doing her homework. Billy went downstairs to the kitchen. She took three things out of the fridge: the milk, a bottle of orange juice and some lemonade. It was difficult to choose, so Billy put all three of them in one glass. Then she took it upstairs and put it down on Jane\'s desk. Jane picked up the drink and tasted it. "Oh no, Billy!" she laughed, "This is horrible!". "Hahaha. Come here and play with me." said Billy.',
      questionContent: 'Who is Jane?',
      options: [
        'A. She is Billy\'s elder sister.',
        'B. She is Billy\'s younger sister.',
        'C. She is Billy\'s friend.',
        'D. She is Billy\'s mother.'
      ],
      correctAnswer: 'A. She is Billy\'s elder sister.',
      explanation: 'Trong bài có đề cập: "Perhaps Jane will play with me." But her elder sister was doing her homework. Suy ra Jane là chị gái (elder sister).'
    },
    {
      id: 'q6',
      type: 'multiple-choice',
      passage: 'NAUGHTY BILLY\nBilly lives in a flat in the city with her family. Last Saturday was a very hot day and her family decided to stay at home. Billy didn\'t have anyone to play with. She asked her dad, but he had to wash the car. She didn\'t ask her mum, because she was in the living room with one of her friends. Billy thought, "Perhaps Jane will play with me." But her elder sister was doing her homework. Billy went downstairs to the kitchen. She took three things out of the fridge: the milk, a bottle of orange juice and some lemonade. It was difficult to choose, so Billy put all three of them in one glass. Then she took it upstairs and put it down on Jane\'s desk. Jane picked up the drink and tasted it. "Oh no, Billy!" she laughed, "This is horrible!". "Hahaha. Come here and play with me." said Billy.',
      questionContent: 'What was Jane doing when Billy asked her to play with?',
      options: [
        'A. She was watching TV.',
        'B. She was doing the housework.',
        'C. She was doing her homework.',
        'D. She was talking on the phone.'
      ],
      correctAnswer: 'C. She was doing her homework.',
      explanation: 'Trong đoạn văn có mô tả lúc Billy định rủ Jane chơi cùng: "But her elder sister was doing her homework." (Nhưng chị gái cô đang làm bài tập về nhà).'
    },
    {
      id: 'q7',
      type: 'multiple-choice',
      passage: 'NAUGHTY BILLY\nBilly lives in a flat in the city with her family. Last Saturday was a very hot day and her family decided to stay at home. Billy didn\'t have anyone to play with. She asked her dad, but he had to wash the car. She didn\'t ask her mum, because she was in the living room with one of her friends. Billy thought, "Perhaps Jane will play with me." But her elder sister was doing her homework. Billy went downstairs to the kitchen. She took three things out of the fridge: the milk, a bottle of orange juice and some lemonade. It was difficult to choose, so Billy put all three of them in one glass. Then she took it upstairs and put it down on Jane\'s desk. Jane picked up the drink and tasted it. "Oh no, Billy!" she laughed, "This is horrible!". "Hahaha. Come here and play with me." said Billy.',
      questionContent: 'Which of the following statements is NOT TRUE?',
      options: [
        'A. Billy gave her sister a glass of orange juice.',
        'B. It was hot last Saturday.',
        'C. Billy took three things from the fridge: some lemonade, a bottle of orange juice and the milk.',
        'D. Billy lived with her family in the city.'
      ],
      correctAnswer: 'A. Billy gave her sister a glass of orange juice.',
      explanation: 'Dữ kiện A không đúng vì Billy không đưa riêng nước cam mà đã trộn lẫn 3 thức uống (milk, orange juice, lemonade) vào chung một ly: "...so Billy put all three of them in one glass."'
    },
    {
      id: 'q8',
      type: 'fill-in-the-blank',
      questionContent: 'Viết lại câu sau sao cho nghĩa không đổi:\nAre there 63 provinces and cities in your country?',
      correctAnswer: 'Does your country have 63 provinces and cities?',
      explanation: 'Sử dụng cấu trúc "Does [subject] have..." thay thế cho "Are there..."'
    },
    {
      id: 'q9',
      type: 'fill-in-the-blank',
      questionContent: 'Viết lại câu sau sao cho nghĩa không đổi:\nWhat is the distance between Noi Bai airport and your house?',
      correctAnswer: 'How far is it from Noi Bai airport to your house?',
      explanation: 'Sử dụng cấu trúc "How far is it from [A] to [B]?" để hỏi về khoảng cách.'
    },
    {
      id: 'q10',
      type: 'fill-in-the-blank',
      questionContent: 'Dùng từ gợi ý trong ngoặc để viết lại câu:\nWe go to school at seven fifteen every morning. (QUARTER)',
      correctAnswer: 'We go to school at a quarter past seven every morning.',
      explanation: '"7:15" được đọc là "a quarter past seven".'
    },
    {
      id: 'q11',
      type: 'fill-in-the-blank',
      questionContent: 'Tìm và sửa LỖI SAI trong câu (nhập câu hoàn chỉnh):\nLaura is the same age to me.',
      correctAnswer: 'Laura is the same age as me.',
      explanation: 'Thành ngữ đúng là "the same age as" không phải "the same age to".'
    },
    {
      id: 'q12',
      type: 'multiple-choice',
      questionContent: 'Look at the picture & select answer.',
      media: {
        type: 'image',
        url: 'data:image/png;base64,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' // Mock audio url
      },
      options: ['Apple', 'Banana', 'Orange', 'Mango'],
      correctAnswer: 'Apple',
      explanation: 'Trong hình ảnh trên ta thấy quả táo (Apple).'
    },
    {
  id: 'q13',
  type: 'matching',
  questionContent: 'Match the words with their meanings:',

  leftItems: ['dog', 'cat', 'bird', 'apple'],
  rightItems: ['mèo', 'chim', 'chó', 'táo'],

  correctAnswer: {
    dog: 'chó',
    cat: 'mèo',
    bird: 'chim',
    apple: 'táo'
  },

  explanation: 'Dog = chó, Cat = mèo, Bird = chim, Apple = táo'
}
  ]
  }
};