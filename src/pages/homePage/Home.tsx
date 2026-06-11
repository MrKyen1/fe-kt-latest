import HeroSlideshow from "./components/HeroSlideshow";
import AboutUs from "../aboutPage/AboutUs";
import CourseHighlights from "./components/CourseHighlights";
import Teachers from "../teacherPage/Teachers";
import FacilitiesActivities from "../facilitiesPage/FacilitiesActivities";

export default function Home() {
  return (
    <div className="w-full bg-slate-50">
      <HeroSlideshow />
      <AboutUs />
      <CourseHighlights />
      <Teachers />
      <FacilitiesActivities />
    </div>
  );
}
