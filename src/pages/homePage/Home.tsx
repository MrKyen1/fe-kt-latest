import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import HeroSlideshow from "./components/HeroSlideshow";
import AboutUs from "../aboutPage/AboutUs";
import CourseHighlights from "./components/CourseHighlights";
import Teachers from "../teacherPage/Teachers";
import FacilitiesActivities from "../facilitiesPage/FacilitiesActivities";
import { homepageService } from "../../services/homepageService";
import { HomepageData } from "../../types/homepage";

export default function Home() {
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
    const scrollTo = searchParams.get("scrollTo");
    if (scrollTo) {
      const timer = setTimeout(() => {
        const element = document.getElementById(scrollTo);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  return (
    <div className="w-full bg-slate-50">
      <HeroSlideshow slides={homepageData?.slider} loading={isLoading} />
      <AboutUs about={homepageData?.about} />
      <CourseHighlights />
      <Teachers />
      <FacilitiesActivities facilities={homepageData?.facilities} />
    </div>
  );
}
