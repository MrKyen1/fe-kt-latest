import { Carousel, Button } from "antd";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

export default function HeroSlideshow() {
  const navigate = useNavigate();

  const slideModules = import.meta.glob(
    "/src/assets/autoslides/*.{png,jpg,jpeg}",
    {
      eager: true,
    },
  );

  const slideUrls = useMemo(() => {
    return (
      Object.values(slideModules)
        .map((m: any) => m.default)
        .sort()
    );
  }, [slideModules]);

  return (
    <section className="relative w-full h-[600px] overflow-hidden">
      <Carousel autoplay effect="fade" className="h-full">
        {slideUrls.map((url, idx) => (
          <div key={url} className="h-[600px] relative">
            <img
              src={url}
              alt={`Slide ${idx + 1}`}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 to-transparent flex items-center">
              <div className="max-w-7xl mx-auto px-6 md:px-16 w-full">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  className="max-w-2xl text-white"
                >
                  <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                    Học Tập Sáng Tạo <br />
                    <span className="text-blue-400">Tương Lai Rạng Rỡ</span>
                  </h1>
                  <p className="text-xl mb-8 text-slate-200">
                    Kata Edu đồng hành cùng học sinh Việt Nam trên con đường
                    chinh phục tri thức, phát triển toàn diện kỹ năng.
                  </p>
                  <Button
                    type="primary"
                    size="large"
                    className="bg-blue-600 hover:bg-blue-500 h-14 px-8 text-lg rounded-full border-none shadow-lg shadow-blue-600/30"
                    onClick={() => navigate("/courses")}
                  >
                    Khám phá khóa học
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        ))}
      </Carousel>
    </section>
  );
}
