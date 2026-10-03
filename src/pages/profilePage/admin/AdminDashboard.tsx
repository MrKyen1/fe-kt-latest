import { useState, useEffect } from "react";

import { Student } from "../../../types";

interface StudentFormValues {
  username: string;
  fullName: string;
  birthYear?: number;
  phone?: string;
  address?: string;
  branch?: string;
  class?: string;
  startDate?: dayjs.Dayjs;
  endDate?: dayjs.Dayjs;
}

import dayjs from "dayjs";
import CenterManagement from "./centerManagement";

export default function AdminDashboard() {
  const [students, setStudents] = useState<Student[]>([]);

  return (
    <div className="space-y-3">
      <div>
        <CenterManagement />
        {/* <StudentRanking
          students={students}
          title="Bảng xếp hạng tháng hiện tại"
          showFilters={true}
          maxResults={5}
        /> */}
      </div>
    </div>
  );
}
