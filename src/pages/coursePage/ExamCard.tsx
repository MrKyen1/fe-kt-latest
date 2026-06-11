import { Button } from "antd";
import { motion } from "framer-motion";
import { Clock, FileText, PlayCircle } from "lucide-react";

type ExamCardProps = {
  exam: {
    id: string;
    title: string;
    timeLimit: number;
  };
  totalQuestions: number;
  index: number;
  onStart: (examId: string) => void;
  loading?: boolean;
};

const formatMinutes = (seconds: number) => Math.ceil(seconds / 60);

export default function ExamCard({ exam, totalQuestions, index, onStart, loading }: ExamCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group"
    >
      <div className="flex items-start gap-6">
        <div className="bg-blue-50 p-4 rounded-2xl text-blue-600">
          <FileText size={32} />
        </div>

        <div>
          <h3 className="text-2xl font-bold text-slate-800 mb-3">{exam.title}</h3>

          <div className="flex flex-wrap items-center gap-6 text-slate-500 font-medium">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-blue-500" />
              <span>{formatMinutes(exam.timeLimit)} phút</span>
            </div>

            <div className="flex items-center gap-2">
              <FileText size={18} className="text-blue-500" />
              <span>{totalQuestions} câu hỏi</span>
            </div>
          </div>
        </div>
      </div>

      <Button
        type="primary"
        size="large"
        className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 h-14 px-8 text-lg rounded-xl border-none shadow-lg shadow-blue-600/20"
        onClick={() => onStart(exam.id)}
        disabled={loading}
        loading={loading}
      >
        Làm bài ngay <PlayCircle className="ml-2 w-5 h-5" />
      </Button>
    </motion.div>
  );
}
