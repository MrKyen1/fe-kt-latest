import { Outlet } from "react-router-dom";
import { Layout as AntLayout } from "antd";

export default function ExamLayout() {
  return (
    <AntLayout className="min-h-screen bg-slate-50 font-sans">
      <AntLayout.Content className="flex-1 flex flex-col">
        <Outlet />
      </AntLayout.Content>
    </AntLayout>
  );
}
