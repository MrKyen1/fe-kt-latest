import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  ConfigProvider,
  Divider,
  Empty,
  Form,
  Input,
  Modal,
  Row,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Tabs,
  Tooltip,
  Typography,
  message,
} from "antd";
import { Save } from "lucide-react";

import {
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  LockOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  TeamOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
} from "@ant-design/icons";

import { rbacService } from "../../../services/rbacService";

const { Title, Text } = Typography;

export default function RbacManagement() {
  // ================= DATA STATE =================
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [matrix, setMatrix] = useState<any>(null);

  // ================= UI STATE =================
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("matrix");

  // Search
  const [roleSearch, setRoleSearch] = useState("");
  const [permSearch, setPermSearch] = useState("");

  // ================= MODAL STATE =================
  /*
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [editingPerm, setEditingPerm] = useState<any>(null);

  // ================= FORMS =================
  const [roleForm] = Form.useForm();
  const [permForm] = Form.useForm();
  */

  // ================= MATRIX STATE =================
  const [matrixAssignments, setMatrixAssignments] = useState<Set<string>>(new Set());
  const [matrixSaving, setMatrixSaving] = useState(false);

  // ================= EFFECTS =================
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, permsData] = await Promise.all([
        rbacService.roles.list(),
        rbacService.permissions.list(),
      ]);
      setRoles(rolesData || []);
      setPermissions(permsData || []);

      // Load matrix
      try {
        const matrixData = await rbacService.rolePermissions.matrix();
        setMatrix(matrixData);
        const assignmentSet = new Set<string>();
        matrixData.assignments?.forEach((a: any) => {
          assignmentSet.add(`${a.roleId}__${a.permissionId}`);
        });
        setMatrixAssignments(assignmentSet);
      } catch {
        // Matrix endpoint might not be available
      }
    } catch (err) {
      message.error("Tải dữ liệu RBAC thất bại");
    } finally {
      setLoading(false);
    }
  };

  /*
  // ================= ROLE HANDLERS =================
  const handleRoleCreate = () => {
    setEditingRole(null);
    roleForm.resetFields();
    setRoleModalOpen(true);
  };

  const handleRoleEdit = (record: any) => {
    setEditingRole(record);
    roleForm.setFieldsValue({
      code: record.code,
      name: record.name,
      description: record.description,
    });
    setRoleModalOpen(true);
  };

  const handleRoleDelete = (record: any) => {
    Modal.confirm({
      title: "Xóa vai trò",
      content: `Bạn có chắc muốn xóa vai trò "${record.name}"?`,
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await rbacService.roles.remove(record.id);
          message.success("Xóa vai trò thành công");
          loadData();
        } catch (err: any) {
          message.error(err.message || "Xóa thất bại");
        }
      },
    });
  };

  const handleRoleSubmit = async (values: any) => {
    try {
      if (editingRole) {
        await rbacService.roles.update(editingRole.id, values);
        message.success("Cập nhật vai trò thành công");
      } else {
        await rbacService.roles.create(values);
        message.success("Tạo vai trò thành công");
      }
      loadData();
      setRoleModalOpen(false);
      roleForm.resetFields();
    } catch (err: any) {
      message.error(err.message || "Thao tác thất bại");
    }
  };

  // ================= PERMISSION HANDLERS =================
  const handlePermCreate = () => {
    setEditingPerm(null);
    permForm.resetFields();
    setPermModalOpen(true);
  };

  const handlePermEdit = (record: any) => {
    setEditingPerm(record);
    permForm.setFieldsValue({
      code: record.code,
      name: record.name,
      description: record.description,
    });
    setPermModalOpen(true);
  };

  const handlePermDelete = (record: any) => {
    Modal.confirm({
      title: "Xóa quyền",
      content: `Bạn có chắc muốn xóa quyền "${record.name}"?`,
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await rbacService.permissions.remove(record.id);
          message.success("Xóa quyền thành công");
          loadData();
        } catch (err: any) {
          message.error(err.message || "Xóa thất bại");
        }
      },
    });
  };

  const handlePermSubmit = async (values: any) => {
    try {
      if (editingPerm) {
        await rbacService.permissions.update(editingPerm.id, values);
        message.success("Cập nhật quyền thành công");
      } else {
        await rbacService.permissions.create(values);
        message.success("Tạo quyền thành công");
      }
      loadData();
      setPermModalOpen(false);
      permForm.resetFields();
    } catch (err: any) {
      message.error(err.message || "Thao tác thất bại");
    }
  };
  */

  // ================= MATRIX HANDLERS =================
  const toggleMatrixCell = (roleId: string, permId: string) => {
    const key = `${roleId}__${permId}`;
    setMatrixAssignments((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleMatrixSave = async () => {
    if (!matrix) return;
    setMatrixSaving(true);
    try {
      const assignments = Array.from(matrixAssignments).map((key) => {
        const [roleId, permissionId] = key.split("__");
        return { roleId, permissionId };
      });

      await rbacService.rolePermissions.syncMatrix({
        roleIds: matrix.roles.map((r: any) => r.id),
        permissionIds: matrix.permissions.map((p: any) => p.id),
        assignments,
      });
      message.success("Cập nhật ma trận phân quyền thành công");
      loadData();
    } catch (err: any) {
      message.error(err.message || "Cập nhật thất bại");
    } finally {
      setMatrixSaving(false);
    }
  };

  // ================= FILTERED DATA =================
  const filteredRoles = roles.filter((r) => {
    const q = roleSearch.trim().toLowerCase();
    if (!q) return true;
    return r.name?.toLowerCase().includes(q) || r.code?.toLowerCase().includes(q);
  });

  const filteredPerms = permissions.filter((p) => {
    const q = permSearch.trim().toLowerCase();
    if (!q) return true;
    return p.name?.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q);
  });

  // ================= COLUMNS =================
  const roleColumns = [
    {
      title: "Vai trò",
      render: (_: any, record: any) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
            {record.name?.charAt(0) || "R"}
          </div>
          <div>
            <div className="font-semibold text-slate-800">{record.name}</div>
            <div className="text-xs text-slate-400 font-mono">{record.code}</div>
          </div>
        </div>
      ),
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      render: (val: string) => (
        <span className="text-slate-500 text-sm">{val || "—"}</span>
      ),
    },
    {
      title: "Trạng thái",
      render: (_: any, record: any) => (
        <Tag
          color={record.isActive !== false ? "success" : "default"}
          className="rounded-full px-2.5 py-0.5 border-none font-medium text-xs"
        >
          {record.isActive !== false ? "Hoạt động" : "Tắt"}
        </Tag>
      ),
    },
    /*
    {
      title: "Thao tác",
      align: "right" as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined className="text-slate-400 hover:text-indigo-600" />}
              onClick={() => handleRoleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Xóa">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined className="text-slate-400 hover:text-rose-600" />}
              onClick={() => handleRoleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
    */
  ];

  const permColumns = [
    {
      title: "Quyền",
      render: (_: any, record: any) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm">
            <LockOutlined />
          </div>
          <div>
            <div className="font-semibold text-slate-800">{record.name}</div>
            <div className="text-xs text-slate-400 font-mono">{record.code}</div>
          </div>
        </div>
      ),
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      render: (val: string) => (
        <span className="text-slate-500 text-sm">{val || "—"}</span>
      ),
    },
    {
      title: "Trạng thái",
      render: (_: any, record: any) => (
        <Tag
          color={record.isActive !== false ? "success" : "default"}
          className="rounded-full px-2.5 py-0.5 border-none font-medium text-xs"
        >
          {record.isActive !== false ? "Hoạt động" : "Tắt"}
        </Tag>
      ),
    },
    /*
    {
      title: "Thao tác",
      align: "right" as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined className="text-slate-400 hover:text-indigo-600" />}
              onClick={() => handlePermEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Xóa">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined className="text-slate-400 hover:text-rose-600" />}
              onClick={() => handlePermDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
    */
  ];

  // ================= RENDER =================
  return (
    <ConfigProvider
      theme={{
        token: {
          borderRadius: 12,
          colorPrimary: "#4f46e5",
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        },
        components: {
          Table: {
            headerBg: "#f8fafc",
            headerColor: "#475569",
            rowHoverBg: "#f1f5f9",
          },
        },
      }}
    >
      <div className="min-h-screen bg-slate-50/50 py-6 px-4 sm:px-6">
        <Spin spinning={loading} size="large">
          <div className="max-w-[1400px] mx-auto space-y-6">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-100 p-6 rounded-3xl shadow-sm">
              <div>
                <Title level={2} className="!mb-0.5 !text-slate-800 font-extrabold tracking-tight">
                  <SafetyCertificateOutlined className="mr-3 text-indigo-500" />
                  Quản Lý Phân Quyền (RBAC)
                </Title>
                <Text className="text-slate-400 text-sm">
                  Quản lý vai trò, quyền hạn và ma trận phân quyền hệ thống
                </Text>
              </div>
            </div>

            {/* STATS */}
            <Row gutter={[16, 16]}>
              {[
                {
                  title: "Vai trò",
                  value: roles.length,
                  icon: <TeamOutlined className="text-indigo-500 text-lg" />,
                  bg: "bg-indigo-50",
                  border: "border-indigo-100/60",
                },
                {
                  title: "Quyền hạn",
                  value: permissions.length,
                  icon: <LockOutlined className="text-emerald-500 text-lg" />,
                  bg: "bg-emerald-50",
                  border: "border-emerald-100/60",
                },
                {
                  title: "Mapping",
                  value: matrixAssignments.size,
                  icon: <KeyOutlined className="text-amber-500 text-lg" />,
                  bg: "bg-amber-50",
                  border: "border-amber-100/60",
                },
              ].map((item, index) => (
                <Col xs={24} sm={8} key={index}>
                  <div
                    className={`bg-white border ${item.border} rounded-2xl p-5 flex items-center justify-between shadow-sm`}
                  >
                    <div>
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        {item.title}
                      </span>
                      <h2 className="text-2xl font-black text-slate-800 mt-1 mb-0">{item.value}</h2>
                    </div>
                    <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center`}>
                      {item.icon}
                    </div>
                  </div>
                </Col>
              ))}
            </Row>

            {/* TABS */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                  /*
                  {
                    key: "roles",
                    label: (
                      <span className="flex items-center gap-2 px-1 py-1.5 text-sm font-bold">
                        <TeamOutlined /> Vai trò ({roles.length})
                      </span>
                    ),
                    children: (
                      <div className="space-y-4 pt-4">
                        <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                          <Input
                            placeholder="Tìm kiếm vai trò..."
                            prefix={<SearchOutlined className="text-slate-400" />}
                            value={roleSearch}
                            onChange={(e) => setRoleSearch(e.target.value)}
                            className="max-w-md rounded-xl border-slate-200"
                            allowClear
                          />
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleRoleCreate}
                            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm font-semibold"
                          >
                            Tạo Vai trò
                          </Button>
                        </div>
                        <Table
                          rowKey="id"
                          dataSource={filteredRoles}
                          columns={roleColumns}
                          pagination={{ pageSize: 10, showSizeChanger: false }}
                          locale={{ emptyText: "Không tìm thấy vai trò nào" }}
                          className="border border-slate-100 rounded-2xl overflow-hidden"
                        />
                      </div>
                    ),
                  },
                  {
                    key: "permissions",
                    label: (
                      <span className="flex items-center gap-2 px-1 py-1.5 text-sm font-bold">
                        <LockOutlined /> Quyền hạn ({permissions.length})
                      </span>
                    ),
                    children: (
                      <div className="space-y-4 pt-4">
                        <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                          <Input
                            placeholder="Tìm kiếm quyền..."
                            prefix={<SearchOutlined className="text-slate-400" />}
                            value={permSearch}
                            onChange={(e) => setPermSearch(e.target.value)}
                            className="max-w-md rounded-xl border-slate-200"
                            allowClear
                          />
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handlePermCreate}
                            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm font-semibold"
                          >
                            Tạo Quyền
                          </Button>
                        </div>
                        <Table
                          rowKey="id"
                          dataSource={filteredPerms}
                          columns={permColumns}
                          pagination={{ pageSize: 10, showSizeChanger: false }}
                          locale={{ emptyText: "Không tìm thấy quyền nào" }}
                          className="border border-slate-100 rounded-2xl overflow-hidden"
                        />
                      </div>
                    ),
                  },
                  */
                  {
                    key: "matrix",
                    label: (
                      <span className="flex items-center gap-2 px-1 py-1.5 text-sm font-bold">
                        <KeyOutlined /> Ma trận phân quyền
                      </span>
                    ),
                    children: (
                      <div className="space-y-4 pt-4">
                        {matrix ? (
                          <>
                            <div className="flex justify-between items-center">
                              <Text className="text-slate-500 text-sm">
                                Click vào ô để bật/tắt quyền cho vai trò tương ứng
                              </Text>
                              <Button
                                type="primary"
                                loading={matrixSaving}
                                onClick={handleMatrixSave}
                                icon={<Save size={15} />}
                                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm font-semibold"
                              >
                                Lưu thay đổi
                              </Button>
                            </div>
                            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                              <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50">
                                  <tr>
                                    <th className="sticky left-0 bg-slate-50 z-10 px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-100">
                                      Quyền \ Vai trò
                                    </th>
                                    {(matrix.roles || []).map((role: any) => (
                                      <th
                                        key={role.id}
                                        className="px-3 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider min-w-[100px]"
                                      >
                                        <div className="flex flex-col items-center gap-1">
                                          <span>{role.name}</span>
                                          <span className="text-[10px] text-slate-400 font-mono normal-case">
                                            {role.code}
                                          </span>
                                        </div>
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 bg-white">
                                  {(matrix.permissions || []).map((perm: any) => (
                                    <tr key={perm.id} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="sticky left-0 bg-white z-10 px-4 py-3 text-sm text-slate-700 border-r border-slate-100">
                                        <div className="font-medium">{perm.name}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">{perm.code}</div>
                                      </td>
                                      {(matrix.roles || []).map((role: any) => {
                                        const isActive = matrixAssignments.has(
                                          `${role.id}__${perm.id}`,
                                        );
                                        return (
                                          <td
                                            key={role.id}
                                            className="px-3 py-3 text-center cursor-pointer"
                                            onClick={() => toggleMatrixCell(role.id, perm.id)}
                                          >
                                            {isActive ? (
                                              <CheckCircleFilled className="text-emerald-500 text-xl transition-transform hover:scale-125" />
                                            ) : (
                                              <CloseCircleFilled className="text-slate-200 text-xl transition-transform hover:scale-125 hover:text-rose-300" />
                                            )}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </>
                        ) : (
                          <Empty description="Không thể tải ma trận phân quyền" />
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            </div>

            {/* ROLE MODAL */}
            {/*
            <Modal
              title={editingRole ? "Cập nhật Vai trò" : "Tạo Vai trò mới"}
              open={roleModalOpen}
              onCancel={() => setRoleModalOpen(false)}
              onOk={() => roleForm.submit()}
              okText="Lưu lại"
              cancelText="Hủy bỏ"
              className="rounded-2xl"
            >
              <Form form={roleForm} layout="vertical" onFinish={handleRoleSubmit} onFinishFailed={() => message.error("Vui lòng kiểm tra và nhập/chọn đầy đủ các thông tin bắt buộc!")} scrollToFirstError={{ behavior: "smooth", block: "center" }} className="pt-2">
                <Form.Item
                  name="code"
                  label="Mã vai trò"
                  rules={[{ required: true, message: "Vui lòng nhập mã!" }]}
                >
                  <Input placeholder="Ví dụ: teacher" disabled={!!editingRole} className="rounded-xl" />
                </Form.Item>
                <Form.Item
                  name="name"
                  label="Tên vai trò"
                  rules={[{ required: true, message: "Vui lòng nhập tên!" }]}
                >
                  <Input placeholder="Ví dụ: Giáo viên" className="rounded-xl" />
                </Form.Item>
                <Form.Item name="description" label="Mô tả">
                  <Input.TextArea placeholder="Mô tả ngắn..." rows={2} className="rounded-xl" />
                </Form.Item>
              </Form>
            </Modal>
            */}

            {/* PERMISSION MODAL */}
            {/*
            <Modal
              title={editingPerm ? "Cập nhật Quyền" : "Tạo Quyền mới"}
              open={permModalOpen}
              onCancel={() => setPermModalOpen(false)}
              onOk={() => permForm.submit()}
              okText="Lưu lại"
              cancelText="Hủy bỏ"
              className="rounded-2xl"
            >
              <Form form={permForm} layout="vertical" onFinish={handlePermSubmit} onFinishFailed={() => message.error("Vui lòng kiểm tra và nhập/chọn đầy đủ các thông tin bắt buộc!")} scrollToFirstError={{ behavior: "smooth", block: "center" }} className="pt-2">
                <Form.Item
                  name="code"
                  label="Mã quyền"
                  rules={[{ required: true, message: "Vui lòng nhập mã!" }]}
                >
                  <Input placeholder="Ví dụ: users.manage" disabled={!!editingPerm} className="rounded-xl" />
                </Form.Item>
                <Form.Item
                  name="name"
                  label="Tên quyền"
                  rules={[{ required: true, message: "Vui lòng nhập tên!" }]}
                >
                  <Input placeholder="Ví dụ: Quản lý người dùng" className="rounded-xl" />
                </Form.Item>
                <Form.Item name="description" label="Mô tả">
                  <Input.TextArea placeholder="Mô tả ngắn..." rows={2} className="rounded-xl" />
                </Form.Item>
              </Form>
            </Modal>
            */}
          </div>
        </Spin>
      </div>
    </ConfigProvider>
  );
}
