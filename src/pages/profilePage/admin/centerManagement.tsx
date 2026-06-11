import { useState } from "react";

import {
  Avatar,
  Button,
  Card,
  Col,
  Collapse,
  ConfigProvider,
  DatePicker,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";

import {
  BookOutlined,
  HomeOutlined,
  PlusOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

interface SectionCardProps {
  title: string;
  description?: string;
  color?: string;
  children: React.ReactNode;
}

function SectionCard({
  title,
  description,
  color = "from-blue-500 to-indigo-600",
  children,
}: SectionCardProps) {
  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
      {/* HEADER */}
      <div className={`bg-gradient-to-r ${color} px-6 py-5`}>
        <div className="text-white font-bold text-xl">{title}</div>

        {description && (
          <div className="text-white/80 text-sm mt-1">{description}</div>
        )}
      </div>

      {/* CONTENT */}
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function CenterManagement() {
  // ================= DATA =================

  const [centers, setCenters] = useState([
    {
      id: "1",
      name: "Kata Hà Nội",
      address: "Cầu Giấy",
      phone: "0123456789",
      email: "hanoi@kata.edu.vn",
    },

    {
      id: "2",
      name: "Kata Đà Nẵng",
      address: "Hải Châu",
      phone: "0988888888",
      email: "danang@kata.edu.vn",
    },
  ]);

  const [classes, setClasses] = useState([
    {
      id: "1",
      name: "Toán 6A",
      centerId: "1",
    },

    {
      id: "2",
      name: "IELTS Foundation",
      centerId: "1",
    },

    {
      id: "3",
      name: "Tiếng Anh 7",
      centerId: "2",
    },
  ]);

  const [teachers, setTeachers] = useState([
    {
      id: "1",

      username: "teacher01",

      fullName: "Nguyễn Văn A",

      phone: "0123456789",

      email: "teacher@gmail.com",

      centerId: "1",

      teacherProfile: {
        specialization: "Toán học",
        yearsOfExperience: 5,
      },
    },

    {
      id: "2",

      username: "teacher02",

      fullName: "Trần Văn B",

      phone: "0988888888",

      email: "ielts@gmail.com",

      centerId: "1",

      teacherProfile: {
        specialization: "IELTS",
        yearsOfExperience: 7,
      },
    },
  ]);

  const [students, setStudents] = useState([
    {
      id: "1",

      username: "kien",

      fullName: "Ngô Đăng Kiên",

      phone: "0988888888",

      classId: "1",

      centerId: "1",
    },

    {
      id: "2",

      username: "long",

      fullName: "Nguyễn Văn Long",

      phone: "0911111111",

      classId: "2",

      centerId: "1",
    },
  ]);

  // ================= MODAL =================

  const [centerOpen, setCenterOpen] = useState(false);

  const [classOpen, setClassOpen] = useState(false);

  const [teacherOpen, setTeacherOpen] = useState(false);

  const [studentOpen, setStudentOpen] = useState(false);

  // ================= FORM =================

  const [centerForm] = Form.useForm();

  const [classForm] = Form.useForm();

  const [teacherForm] = Form.useForm();

  const [studentForm] = Form.useForm();

  // ================= CREATE =================

  const handleCreateCenter = (values: any) => {
    setCenters((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        ...values,
      },
    ]);

    centerForm.resetFields();

    setCenterOpen(false);

    message.success("Tạo trung tâm thành công");
  };

  const handleCreateClass = (values: any) => {
    setClasses((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        ...values,
      },
    ]);

    classForm.resetFields();

    setClassOpen(false);

    message.success("Tạo lớp thành công");
  };

  const handleCreateTeacher = (values: any) => {
    setTeachers((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        username: values.username,
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        centerId: values.centerId,

        teacherProfile: {
          specialization: values.specialization,

          yearsOfExperience: values.yearsOfExperience,
        },
      },
    ]);

    teacherForm.resetFields();

    setTeacherOpen(false);

    message.success("Tạo giáo viên thành công");
  };

  const handleCreateStudent = (values: any) => {
    setStudents((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        ...values,
      },
    ]);

    studentForm.resetFields();

    setStudentOpen(false);

    message.success("Tạo học sinh thành công");
  };

  // ================= TABLE =================

  const studentColumns = [
    {
      title: "Học sinh",

      render: (_: any, record: any) => (
        <div className="flex items-center gap-3">
          <Avatar className="bg-gradient-to-r from-blue-500 to-indigo-500">
            {record.fullName.charAt(0)}
          </Avatar>

          <div>
            <div className="font-semibold">{record.fullName}</div>

            <div className="text-xs text-gray-500">@{record.username}</div>
          </div>
        </div>
      ),
    },

    {
      title: "Lớp",

      render: (_: any, record: any) => {
        const cls = classes.find((c) => c.id === record.classId);

        return <Tag color="blue">{cls?.name}</Tag>;
      },
    },

    {
      title: "SĐT",
      dataIndex: "phone",
    },
  ];

  return (
    <ConfigProvider
      theme={{
        token: {
          borderRadius: 18,
          colorPrimary: "#4f46e5",
        },
      }}
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 p-6">
        <div className="space-y-8">
          {/* HEADER */}
          <div className="bg-white rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
              <Title level={2} className="!text-white !mb-1">
                Center Management
              </Title>

              <Text className="text-white/80">
                Parent - Child Relationship Dashboard
              </Text>
            </div>
          </div>

          {/* STATS */}
          <Row gutter={[20, 20]}>
            {[
              {
                title: "Trung tâm",
                value: centers.length,
                icon: <HomeOutlined />,
                color: "from-blue-500 to-indigo-600",
              },

              {
                title: "Lớp học",
                value: classes.length,
                icon: <BookOutlined />,
                color: "from-purple-500 to-pink-500",
              },

              {
                title: "Giáo viên",
                value: teachers.length,
                icon: <TeamOutlined />,
                color: "from-emerald-500 to-green-600",
              },

              {
                title: "Học sinh",
                value: students.length,
                icon: <UserOutlined />,
                color: "from-orange-500 to-red-500",
              },
            ].map((item, index) => (
              <Col xs={24} sm={12} lg={6} key={index}>
                <div
                  className={`rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] bg-gradient-to-r ${item.color} p-6 transition-all duration-300 hover:scale-[1.03]`}
                >
                  <Statistic
                    title={<span className="text-white/80">{item.title}</span>}
                    value={item.value}
                    prefix={item.icon}
                    valueStyle={{
                      color: "white",
                      fontSize: 34,
                      fontWeight: 700,
                    }}
                  />
                </div>
              </Col>
            ))}
          </Row>

          {/* ACTIONS */}
          <SectionCard
            title="Quick Actions"
            description="Manage center system quickly"
            color="from-slate-700 to-slate-900"
          >
            <Space wrap size="middle">
              <Button
                size="large"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCenterOpen(true)}
              >
                Tạo Trung tâm
              </Button>

              <Button
                size="large"
                icon={<PlusOutlined />}
                onClick={() => setClassOpen(true)}
              >
                Tạo Lớp
              </Button>

              <Button
                size="large"
                icon={<PlusOutlined />}
                onClick={() => setTeacherOpen(true)}
              >
                Tạo Giáo viên
              </Button>

              <Button
                size="large"
                icon={<PlusOutlined />}
                onClick={() => setStudentOpen(true)}
              >
                Tạo Học sinh
              </Button>
            </Space>
          </SectionCard>

          {/* CENTER TREE */}
          <Collapse
            accordion
            size="large"
            className="rounded-3xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.08)] bg-white"
            items={centers.map((center) => {
              const centerClasses = classes.filter(
                (cls) => cls.centerId === center.id,
              );

              const centerTeachers = teachers.filter(
                (teacher) => teacher.centerId === center.id,
              );

              const centerStudents = students.filter(
                (student) => student.centerId === center.id,
              );

              return {
                key: center.id,

                label: (
                  <div className="flex items-center justify-between pr-6">
                    <div>
                      <div className="text-lg font-bold">🏫 {center.name}</div>

                      <div className="text-sm text-gray-500 mt-1">
                        {center.address}
                      </div>
                    </div>

                    <Tag color="green" className="px-3 py-1 rounded-full">
                      Active
                    </Tag>
                  </div>
                ),

                children: (
                  <div className="space-y-8">
                    {/* CENTER INFO */}
                    <SectionCard
                      title="📌 Center Information"
                      color="from-blue-500 to-indigo-600"
                    >
                      <Row gutter={[24, 24]}>
                        <Col xs={24} md={8}>
                          <div className="bg-slate-50 rounded-2xl p-5">
                            <div className="text-gray-500 text-sm">Email</div>

                            <div className="font-semibold mt-2">
                              {center.email}
                            </div>
                          </div>
                        </Col>

                        <Col xs={24} md={8}>
                          <div className="bg-slate-50 rounded-2xl p-5">
                            <div className="text-gray-500 text-sm">Phone</div>

                            <div className="font-semibold mt-2">
                              {center.phone}
                            </div>
                          </div>
                        </Col>

                        <Col xs={24} md={8}>
                          <div className="bg-slate-50 rounded-2xl p-5">
                            <div className="text-gray-500 text-sm">
                              Students
                            </div>

                            <div className="font-semibold mt-2">
                              {centerStudents.length}
                            </div>
                          </div>
                        </Col>
                      </Row>
                    </SectionCard>

                    {/* CLASSES */}
                    <SectionCard
                      title="📚 Classes"
                      description="Center classes"
                      color="from-emerald-500 to-green-600"
                    >
                      <Row gutter={[20, 20]}>
                        {centerClasses.map((cls) => (
                          <Col xs={24} md={8} key={cls.id}>
                            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                              <div className="text-lg font-bold">
                                {cls.name}
                              </div>

                              <div className="text-gray-500 mt-3">
                                Students:{" "}
                                {
                                  students.filter((s) => s.classId === cls.id)
                                    .length
                                }
                              </div>
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </SectionCard>

                    {/* TEACHERS */}
                    <SectionCard
                      title="👨‍🏫 Teachers"
                      description="Center teachers"
                      color="from-purple-500 to-pink-500"
                    >
                      <Row gutter={[24, 24]}>
                        {centerTeachers.map((teacher) => (
                          <Col xs={24} md={12} lg={8} key={teacher.id}>
                            <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300">
                              <div className="flex flex-col items-center">
                                <Avatar
                                  size={80}
                                  className="bg-gradient-to-r from-indigo-500 to-purple-500"
                                >
                                  {teacher.fullName.charAt(0)}
                                </Avatar>

                                <div className="font-bold text-lg mt-4">
                                  {teacher.fullName}
                                </div>

                                <div className="text-gray-500 text-sm">
                                  @{teacher.username}
                                </div>

                                <Tag
                                  color="purple"
                                  className="mt-4 rounded-full px-3 py-1"
                                >
                                  {teacher.teacherProfile?.specialization}
                                </Tag>

                                <Divider />

                                <div className="text-center text-gray-500 text-sm space-y-1">
                                  <div>{teacher.email}</div>

                                  <div>{teacher.phone}</div>

                                  <div>
                                    {teacher.teacherProfile?.yearsOfExperience}{" "}
                                    years
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </SectionCard>

                    {/* STUDENTS */}
                    <SectionCard
                      title="👨‍🎓 Students"
                      description="Center students"
                      color="from-orange-500 to-red-500"
                    >
                      {centerStudents.length > 0 ? (
                        <Table
                          rowKey="id"
                          dataSource={centerStudents}
                          columns={studentColumns}
                          pagination={false}
                        />
                      ) : (
                        <Empty />
                      )}
                    </SectionCard>
                  </div>
                ),
              };
            })}
          />

          {/* CREATE CENTER */}
          <Modal
            title="Tạo Trung tâm"
            open={centerOpen}
            onCancel={() => setCenterOpen(false)}
            onOk={() => centerForm.submit()}
          >
            <Form
              form={centerForm}
              layout="vertical"
              onFinish={handleCreateCenter}
            >
              <Form.Item name="name" label="Tên trung tâm">
                <Input />
              </Form.Item>

              <Form.Item name="address" label="Địa chỉ">
                <Input />
              </Form.Item>

              <Form.Item name="phone" label="Số điện thoại">
                <Input />
              </Form.Item>

              <Form.Item name="email" label="Email">
                <Input />
              </Form.Item>
            </Form>
          </Modal>

          {/* CREATE CLASS */}
          <Modal
            title="Tạo Lớp"
            open={classOpen}
            onCancel={() => setClassOpen(false)}
            onOk={() => classForm.submit()}
          >
            <Form
              form={classForm}
              layout="vertical"
              onFinish={handleCreateClass}
            >
              <Form.Item name="name" label="Tên lớp">
                <Input />
              </Form.Item>

              <Form.Item name="centerId" label="Trung tâm">
                <Select>
                  {centers.map((center) => (
                    <Select.Option key={center.id} value={center.id}>
                      {center.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Form>
          </Modal>

          {/* CREATE TEACHER */}
          <Modal
            title="Tạo Giáo viên"
            open={teacherOpen}
            onCancel={() => setTeacherOpen(false)}
            onOk={() => teacherForm.submit()}
          >
            <Form
              layout="vertical"
              form={teacherForm}
              onFinish={handleCreateTeacher}
            >
              <Form.Item name="username" label="Username">
                <Input />
              </Form.Item>

              <Form.Item name="fullName" label="Họ tên">
                <Input />
              </Form.Item>

              <Form.Item name="email" label="Email">
                <Input />
              </Form.Item>

              <Form.Item name="phone" label="SĐT">
                <Input />
              </Form.Item>

              <Form.Item name="centerId" label="Trung tâm">
                <Select>
                  {centers.map((center) => (
                    <Select.Option key={center.id} value={center.id}>
                      {center.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="specialization" label="Chuyên môn">
                <Select
                  options={[
                    {
                      label: "Toán học",
                      value: "Toán học",
                    },

                    {
                      label: "IELTS",
                      value: "IELTS",
                    },

                    {
                      label: "Tiếng Anh",
                      value: "Tiếng Anh",
                    },

                    {
                      label: "Lập trình",
                      value: "Lập trình",
                    },
                  ]}
                />
              </Form.Item>

              <Form.Item name="yearsOfExperience" label="Kinh nghiệm">
                <InputNumber className="w-full" min={0} />
              </Form.Item>
            </Form>
          </Modal>

          {/* CREATE STUDENT */}
          <Modal
            title="Tạo Học sinh"
            open={studentOpen}
            onCancel={() => setStudentOpen(false)}
            onOk={() => studentForm.submit()}
            width={820}
          >
            <Form
              layout="vertical"
              form={studentForm}
              onFinish={handleCreateStudent}
              labelCol={{ style: { marginBottom: 4 } }}
            >
              <div className="grid grid-cols-2 gap-10 items-start">
                {/* ================= LEFT ================= */}
                <div className="space-y-6">
                  <h3 className="text-sm font-bold uppercase text-slate-500 tracking-wide">
                    THÔNG TIN CÁ NHÂN
                  </h3>

                  <Form.Item
                    name="username"
                    label="Username"
                    rules={[{ required: true, message: "Nhập username!" }]}
                  >
                    <Input placeholder="kien" />
                  </Form.Item>

                  <Form.Item
                    name="fullName"
                    label="Họ tên"
                    rules={[{ required: true, message: "Nhập họ tên!" }]}
                  >
                    <Input placeholder="Nguyễn Văn A" />
                  </Form.Item>

                  <Form.Item
                    name="birthYear"
                    label="Năm sinh"
                    rules={[{ required: true, message: "Chọn năm sinh!" }]}
                  >
                    <DatePicker picker="year" style={{ width: "100%" }} />
                  </Form.Item>

                  <Form.Item
                    name="phone"
                    label="SĐT"
                    rules={[{ required: true, message: "Nhập số điện thoại!" }]}
                  >
                    <Input placeholder="0123456789" />
                  </Form.Item>

                  <Form.Item
                    name="address"
                    label="Địa chỉ"
                    rules={[{ required: true, message: "Nhập địa chỉ!" }]}
                  >
                    <Input placeholder="Địa chỉ" />
                  </Form.Item>
                </div>

                {/* ================= RIGHT ================= */}
                <div className="space-y-6">
                  <h3 className="text-sm font-bold uppercase text-slate-500 tracking-wide">
                    THÔNG TIN HỌC TẬP
                  </h3>

                  <Form.Item
                    name="centerId" // ✅ giữ nguyên field cũ
                    label="Trung tâm"
                    rules={[{ required: true, message: "Chọn trung tâm!" }]}
                  >
                    <Select
                      placeholder="Chọn trung tâm"
                      disabled={centers.length === 0}
                    >
                      {centers.map((center) => (
                        <Select.Option key={center.id} value={center.id}>
                          {center.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="classId"
                    label="Lớp"
                    rules={[{ required: true, message: "Chọn lớp!" }]}
                  >
                    <Select placeholder="Chọn lớp" disabled={!classes.length}>
                      {classes.map((cls) => (
                        <Select.Option key={cls.id} value={cls.id}>
                          {cls.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>

                  {/* spacing thay divider */}
                  <div className="pt-5" />

                  <h3 className="text-sm font-bold uppercase text-slate-500 tracking-wide">
                    THỜI GIAN HỌC
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <Form.Item
                      name="startDate"
                      label="Bắt đầu"
                      rules={[
                        { required: true, message: "Chọn ngày bắt đầu!" },
                      ]}
                    >
                      <DatePicker style={{ width: "100%" }} />
                    </Form.Item>

                    <Form.Item name="endDate" label="Kết thúc">
                      <DatePicker style={{ width: "100%" }} />
                    </Form.Item>
                  </div>
                </div>
              </div>
            </Form>
          </Modal>
        </div>
      </div>
    </ConfigProvider>
  );
}