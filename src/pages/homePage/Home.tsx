import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import HeroSlideshow from "./components/HeroSlideshow";
import AboutUs from "../aboutPage/AboutUs";
import CourseHighlights from "./components/CourseHighlights";
import HomeTeachers from "./components/HomeTeachers";
import FacilitiesActivities from "../facilitiesPage/FacilitiesActivities";
import { homepageService } from "../../services/homepageService";
import { HomepageData } from "../../types/homepage";

export default function Home() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [homepageData, setHomepageData] = useState<HomepageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    homepageService
      .getPublic()
      .then((data) => {
        if (active && data) {
          setHomepageData(data);
        }
      })
      .catch((err) => {
        console.warn("Failed to load public homepage CMS data:", err);
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const hash = location.hash ? location.hash.replace("#", "") : null;
    const targetId = hash || searchParams.get("scrollTo");
    if (targetId && !isLoading) {
      const timer = setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [location.hash, searchParams, isLoading]);

  return (
    <div className="w-full bg-slate-50">
      <HeroSlideshow slides={homepageData?.slider} loading={isLoading} />
      <AboutUs about={homepageData?.about} />
      <CourseHighlights />
      <HomeTeachers />
      <FacilitiesActivities facilities={homepageData?.facilities} />
    </div>
  );
}
