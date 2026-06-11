import { Button } from "antd";
import { motion } from "framer-motion";
import { PlayCircle } from "lucide-react";

type CourseCardProps = {
  course: {
    id: string;
    title: string;
    image: string;
  };
  onSelect: (courseId: string) => void;
};

export default function CourseCard({ course, onSelect }: CourseCardProps) {
  return (
    <motion.div
      whileHover={{ y: -10 }}
      className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 h-full flex flex-col group"
    >
      <div className="relative h-56 overflow-hidden">
        <img
          src={course.image}
          alt={course.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
      <div className="p-8 flex-1 flex flex-col">
        <h3 className="text-2xl font-bold text-slate-800 mb-4 line-clamp-2">{course.title}</h3>
        <p className="text-slate-500 mb-8 flex-1">Chương trình học được thiết kế khoa học, bám sát thực tế và nhu cầu của học sinh.</p>
        <Button
          type="primary"
          className="w-full bg-blue-50 h-14 text-blue-600 font-semibold text-lg rounded-xl hover:bg-blue-600 hover:text-white transition-colors border-none shadow-none flex items-center justify-center"
          onClick={() => onSelect(course.id)}
        >
          Vào học <PlayCircle className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </motion.div>
  );
}
