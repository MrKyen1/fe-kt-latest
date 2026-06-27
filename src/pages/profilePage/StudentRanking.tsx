// import React, { useMemo, useState } from "react";
// import {
//   Card,
//   Table,
//   Tag,
//   Select,
//   Row,
//   Col,
//   Statistic,
//   Avatar,
//   Badge,
// } from "antd";
// import { TrophyOutlined, CrownOutlined, StarOutlined } from "@ant-design/icons";
// import dayjs from "dayjs";
// import { Student } from "../../types";
// import { calculateRankingScore } from "../../utils/rankingUtils";

// interface StudentRankingProps {
//   students: Student[];
//   currentStudentId?: string;
//   title?: string;
//   showFilters?: boolean;
//   maxResults?: number;
//   compact?: boolean;
// }

// export default function StudentRanking({
//   students,
//   currentStudentId,
//   title,
//   showFilters = true,
//   maxResults = 5,
//   compact = false,
// }: StudentRankingProps) {
//   const [selectedClass, setSelectedClass] = useState<string | null>(null);
//   const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

//   const monthLabel = dayjs().format("MM/YYYY");

//   const sampleStudents: Student[] = [
//     {
//       id: "student_sample_1",
//       fullName: "Ngọc Lan",
//       birthYear: 2011,
//       class: "Teen A",
//       branch: "cs1",
//       totalTimeSpent: 120,
//       correctAnswers: 85,
//       totalExams: 12,
//       startDate: "2024-01-10",
//       status: "active",
//     },
//     {
//       id: "student_sample_2",
//       fullName: "Anh Tuấn",
//       birthYear: 2009,
//       class: "Teen B",
//       branch: "cs2",
//       totalTimeSpent: 95,
//       correctAnswers: 92,
//       totalExams: 15,
//       startDate: "2024-02-18",
//       status: "active",
//     },
//     {
//       id: "student_sample_3",
//       fullName: "Thu Mai",
//       birthYear: 2012,
//       class: "Teen A",
//       branch: "cs1",
//       totalTimeSpent: 150,
//       correctAnswers: 78,
//       totalExams: 10,
//       startDate: "2024-03-05",
//       status: "active",
//     },
//     {
//       id: "student_sample_4",
//       fullName: "Minh Khoa",
//       birthYear: 2010,
//       class: "Teen A",
//       branch: "cs2",
//       totalTimeSpent: 110,
//       correctAnswers: 88,
//       totalExams: 14,
//       startDate: "2024-01-20",
//       status: "active",
//     },
//     {
//       id: "student_sample_5",
//       fullName: "Lan Anh",
//       birthYear: 2008,
//       class: "Teen B",
//       branch: "cs1",
//       totalTimeSpent: 130,
//       correctAnswers: 95,
//       totalExams: 16,
//       startDate: "2024-02-10",
//       status: "active",
//     },
//     {
//       id: "student_sample_6",
//       fullName: "Quang Huy",
//       birthYear: 2011,
//       class: "Teen A",
//       branch: "cs2",
//       totalTimeSpent: 100,
//       correctAnswers: 82,
//       totalExams: 11,
//       startDate: "2024-03-15",
//       status: "active",
//     },
//   ];

//   const effectiveStudents = students.length > 0 ? students : sampleStudents;

//   // Get unique classes and branches for filters
//   const availableClasses = [
//     ...new Set(effectiveStudents.map((s) => s.class).filter(Boolean)),
//   ];
//   const availableBranches = [
//     ...new Set(effectiveStudents.map((s) => s.branch).filter(Boolean)),
//   ];

//   const filteredStudents = useMemo(() => {
//     let filtered = effectiveStudents;

//     if (selectedClass) {
//       filtered = filtered.filter((student) => student.class === selectedClass);
//     }

//     if (selectedBranch) {
//       filtered = filtered.filter(
//         (student) => student.branch === selectedBranch,
//       );
//     }

//     return filtered
//       .filter((student) => {
//         const today = new Date();
//         const started = student.startDate
//           ? new Date(student.startDate) <= today
//           : true;
//         const active = student.endDate
//           ? new Date(student.endDate) >= today
//           : true;
//         return started && active;
//       })
//       .sort((a, b) => {
//         const scoreA = calculateRankingScore(a);
//         const scoreB = calculateRankingScore(b);

//         if (scoreA !== scoreB) {
//           return scoreB - scoreA; // Higher score first
//         }

//         // Tie breakers
//         const timeA = a.totalTimeSpent ?? 0;
//         const timeB = b.totalTimeSpent ?? 0;
//         if (timeA !== timeB) {
//           return timeA - timeB; // Less time is better
//         }

//         const birthA = a.birthYear ?? 0;
//         const birthB = b.birthYear ?? 0;
//         return birthA - birthB;
//       })
//       .slice(0, maxResults);
//   }, [effectiveStudents, selectedClass, selectedBranch, maxResults]);

//   const getRankIcon = (rank: number) => {
//     switch (rank) {
//       case 1:
//         return <CrownOutlined className="text-yellow-500 text-xl" />;
//       case 2:
//         return <TrophyOutlined className="text-gray-400 text-xl" />;
//       case 3:
//         return <StarOutlined className="text-amber-600 text-xl" />;
//       default:
//         return (
//           <span className="text-lg font-bold text-slate-600">#{rank}</span>
//         );
//     }
//   };

//   const columns = [
//     {
//       title: "Xếp hạng",
//       dataIndex: "rank",
//       width: compact ? 80 : 100,
//       render: (value: number, record: any) => (
//         <div className="flex items-center justify-center">
//           {record.key === currentStudentId ? (
//             <Badge count="Bạn" color="blue" size="small">
//               {getRankIcon(value)}
//             </Badge>
//           ) : (
//             getRankIcon(value)
//           )}
//         </div>
//       ),
//     },
//     {
//       title: "Học viên",
//       dataIndex: "fullName",
//       render: (value: string, record: any) => (
//         <div className="flex items-center gap-3">
//           <Avatar
//             size={compact ? "small" : "default"}
//             className={`${record.key === currentStudentId ? "ring-2 ring-blue-500" : ""}`}
//             style={{
//               background:
//                 record.key === currentStudentId ? "#1890ff" : "#f0f2f5",
//               color: record.key === currentStudentId ? "#fff" : "#666",
//             }}
//           >
//             {value.charAt(0).toUpperCase()}
//           </Avatar>
//           <div>
//             <div
//               className={`font-medium ${record.key === currentStudentId ? "text-blue-600" : ""}`}
//             >
//               {value}
//             </div>
//             {!compact && (
//               <div className="text-xs text-slate-500">
//                 {record.class} • {record.birthYear}
//               </div>
//             )}
//           </div>
//         </div>
//       ),
//     },
//     ...(compact
//       ? []
//       : [
//           {
//             title: "Lớp",
//             dataIndex: "class",
//             width: 80,
//             render: (value: string) => <Tag color="blue">{value}</Tag>,
//           },
//           {
//             title: "Cơ sở",
//             dataIndex: "branch",
//             width: 80,
//             render: (value: string) => (
//               <Tag color={value === "cs1" ? "green" : "purple"}>
//                 {value === "cs1" ? "CS1" : value === "cs2" ? "CS2" : value}
//               </Tag>
//             ),
//           },
//         ]),
//     {
//       title: compact ? "KQ/Đề" : "Kết quả",
//       dataIndex: "correctAnswers",
//       width: compact ? 70 : 100,
//       render: (value: number, record: any) => (
//         <div className="text-center">
//           <div className="font-semibold">
//             {value ?? 0}/{record.totalExams ?? 0}
//           </div>
//           {!compact && (
//             <div className="text-xs text-slate-500">
//               {record.totalExams
//                 ? (((value ?? 0) / record.totalExams) * 100).toFixed(0)
//                 : 0}
//               %
//             </div>
//           )}
//         </div>
//       ),
//     },
//     ...(compact
//       ? []
//       : [
//           {
//             title: "Thời gian",
//             dataIndex: "totalTimeSpent",
//             width: 100,
//             render: (value: number) => (
//               <span className="text-sm">{value ? `${value}min` : "—"}</span>
//             ),
//           },
//         ]),
//     {
//       title: compact ? "Điểm" : "Điểm xếp hạng",
//       dataIndex: "rankingScore",
//       width: compact ? 60 : 120,
//       render: (value: number) => (
//         <div className="flex items-center gap-1">
//           <StarOutlined className="text-yellow-500" />
//           <span className="font-bold text-lg">{value.toFixed(1)}</span>
//         </div>
//       ),
//     },
//   ];

//   const tableData = filteredStudents.map((student, index) => ({
//     key: student.id,
//     rank: index + 1,
//     ...student,
//     rankingScore: calculateRankingScore(student),
//   }));

//   const statsData = useMemo(() => {
//     if (filteredStudents.length === 0) return null;

//     const totalStudents = filteredStudents.length;
//     const avgCorrect =
//       filteredStudents.reduce((sum, s) => sum + (s.correctAnswers ?? 0), 0) /
//       totalStudents;
//     const avgExams =
//       filteredStudents.reduce((sum, s) => sum + (s.totalExams ?? 0), 0) /
//       totalStudents;
//     const avgTime =
//       filteredStudents.reduce((sum, s) => sum + (s.totalTimeSpent ?? 0), 0) /
//       totalStudents;
//     const avgScore =
//       filteredStudents.reduce((sum, s) => sum + calculateRankingScore(s), 0) /
//       totalStudents;

//     return { avgCorrect, avgExams, avgTime, avgScore };
//   }, [filteredStudents]);

//   return (
//     <div className="space-y-6">
//       <Card
//         title={
//           <div className="flex items-center gap-2">
//             <TrophyOutlined className="text-yellow-500" />
//             {title || `Bảng xếp hạng top học viên tháng ${monthLabel}`}
//           </div>
//         }
//         className="shadow-lg border-0 bg-gradient-to-br from-white to-slate-50"
//         headStyle={{
//           background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
//           color: "white",
//           borderRadius: "12px 12px 0 0",
//         }}
//       >
//         {showFilters && (
//           <Card
//             size="small"
//             className="shadow-sm border-0 bg-gradient-to-r from-blue-50 to-indigo-50"
//             bodyStyle={{ padding: "16px" }}
//           >
//             <Row gutter={[16, 16]} align="middle">
//               <Col xs={24} sm={8}>
//                 <div className="flex flex-col gap-1">
//                   <span className="text-sm font-medium text-slate-600">
//                     Lọc theo lớp:
//                   </span>
//                   <Select
//                     placeholder="Chọn lớp"
//                     value={selectedClass}
//                     onChange={setSelectedClass}
//                     allowClear
//                     style={{ width: "100%" }}
//                     className="rounded-lg"
//                   >
//                     {availableClasses.map((cls) => (
//                       <Select.Option key={cls} value={cls}>
//                         {cls}
//                       </Select.Option>
//                     ))}
//                   </Select>
//                 </div>
//               </Col>
//               <Col xs={24} sm={8}>
//                 <div className="flex flex-col gap-1">
//                   <span className="text-sm font-medium text-slate-600">
//                     Lọc theo cơ sở:
//                   </span>
//                   <Select
//                     placeholder="Chọn cơ sở"
//                     value={selectedBranch}
//                     onChange={setSelectedBranch}
//                     allowClear
//                     style={{ width: "100%" }}
//                     className="rounded-lg"
//                   >
//                     {availableBranches.map((branch) => (
//                       <Select.Option key={branch} value={branch}>
//                         {branch === "cs1"
//                           ? "Cơ sở 1"
//                           : branch === "cs2"
//                             ? "Cơ sở 2"
//                             : branch}
//                       </Select.Option>
//                     ))}
//                   </Select>
//                 </div>
//               </Col>
//               <Col xs={24} sm={8}>
//                 <div className="flex flex-col gap-1">
//                   <span className="text-sm font-medium text-slate-600">
//                     Thống kê:
//                   </span>
//                   <div className="text-xs text-slate-500">
//                     Hiển thị top {maxResults} học viên
//                     {selectedClass && ` lớp ${selectedClass}`}
//                     {selectedBranch &&
//                       ` cơ sở ${selectedBranch === "cs1" ? "1" : "2"}`}
//                   </div>
//                 </div>
//               </Col>
//             </Row>
//           </Card>
//         )}
//         <Table
//           columns={columns}
//           dataSource={tableData}
//           pagination={false}
//           rowClassName={(record) =>
//             record.key === currentStudentId
//               ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500"
//               : "hover:bg-slate-50 transition-colors"
//           }
//           scroll={{ x: compact ? 600 : 800 }}
//           size={compact ? "small" : "middle"}
//           className="modern-table"
//         />
//       </Card>
//     </div>
//   );
// }
