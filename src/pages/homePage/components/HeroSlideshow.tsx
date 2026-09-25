import { Carousel, Button } from "antd";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { HomepageSlide } from "../../../types/homepage";
import { resolveMediaUrl } from "../../../services/apiClient";

interface HeroSlideshowProps {
  slides?: HomepageSlide[];
  loading?: boolean;
}

export default function HeroSlideshow({ slides, loading }: HeroSlideshowProps) {
  const navigate = useNavigate();

  const slideModules = import.meta.glob(
    "/src/assets/autoslides/*.{png,jpg,jpeg}",
    {
      eager: true,
    },
  );

  const fallbackSlideUrls = useMemo(() => {
    return Object.values(slideModules)
      .map((m: any) => m.default)
      .sort();
  }, [slideModules]);

  const activeSlides = useMemo(() => {
    if (!slides || slides.length === 0) return [];
    return [...slides]
      .filter((s) => s.isActive !== false)
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  }, [slides]);

  const hasCmsSlides = activeSlides.length > 0;

  const handleCtaClick = (link?: string) => {
    if (!link) {
      navigate("/courses");
      return;
    }
    if (link.startsWith("http://") || link.startsWith("https://")) {
      window.open(link, "_blank", "noopener,noreferrer");
    } else {
      navigate(link);
    }
  };

  if (loading) {
    return (
      <section className="relative w-full h-[600px] bg-gradient-to-r from-blue-950 via-blue-900 to-slate-900 flex items-center justify-center overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-16 w-full animate-pulse">
          <div className="h-12 bg-white/20 rounded-lg max-w-lg mb-6" />
          <div className="h-6 bg-white/10 rounded-lg max-w-md mb-8" />
          <div className="h-14 bg-blue-600/50 rounded-full w-48" />
        </div>
      </section>
    );
  }

  const carouselKey = hasCmsSlides
    ? `cms-${activeSlides.map((s) => `${s.id}-${s.updatedAt || ""}`).join("_")}`
    : "fallback-autoslides";

  return (
    <section className="relative w-full h-[600px] overflow-hidden">
      <Carousel
        key={carouselKey}
        autoplay
        autoplaySpeed={3500}
        pauseOnHover={false}
        pauseOnFocus={false}
        arrows
        speed={600}
        effect="fade"
        className="h-full"
      >
        {hasCmsSlides
          ? activeSlides.map((slide) => (
              <div key={slide.id} className="h-[600px] relative">
                <img
                  src={resolveMediaUrl(slide.media?.url || "")}
                  alt={slide.altText || slide.title || "Hero banner"}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-950/85 via-blue-900/60 to-transparent flex items-center">
                  <div className="max-w-7xl mx-auto px-6 md:px-16 w-full">
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8 }}
                      className="max-w-2xl text-white"
                    >
                      {slide.title && (
                        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight whitespace-pre-line">
                          {slide.title}
                        </h1>
                      )}
                      {slide.subtitle && (
                        <p className="text-xl mb-8 text-slate-200 leading-relaxed font-normal">
                          {slide.subtitle}
                        </p>
                      )}
                      <Button
                        type="primary"
                        size="large"
                        className="bg-blue-600 hover:bg-blue-500 h-14 px-8 text-lg rounded-full border-none shadow-lg shadow-blue-600/30 transition-transform hover:scale-105"
                        onClick={() => handleCtaClick(slide.ctaLink)}
                      >
                        {slide.ctaLabel || "Khám phá ngay"}
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </div>
            ))
          : fallbackSlideUrls.map((url, idx) => (
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
