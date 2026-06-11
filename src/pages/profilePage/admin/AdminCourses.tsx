import { useEffect, useMemo, useState } from "react";
import { Button, Card, Form, Input, InputNumber, Modal, Select, Space, Table, Tabs, Tag, message } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { learningCmsService } from "../../../services/learningCmsService";

type CmsRow = {
  id: string;
  code?: string;
  name?: string;
  title?: string;
  rank?: number;
  status?: string;
  timeLimitSeconds?: number;
  description?: string;
};

type ResourceKey = "levels" | "skills" | "topics" | "tags" | "exams" | "curriculums";

type ResourceConfig = {
  key: ResourceKey;
  label: string;
  service: {
    list: (params?: any) => Promise<{ data: unknown[] }>;
    create: (payload: unknown) => Promise<unknown>;
    updateStatus?: (id: string, payload: { status: "draft" | "published" | "archived" }) => Promise<unknown>;
  };
};

const resources: ResourceConfig[] = [
  { key: "levels", label: "Levels", service: learningCmsService.levels },
  { key: "skills", label: "Skills", service: learningCmsService.skills },
  { key: "topics", label: "Topics", service: learningCmsService.topics },
  { key: "tags", label: "Tags", service: learningCmsService.tags },
  { key: "exams", label: "Exams", service: learningCmsService.exams },
  { key: "curriculums", label: "Curriculums", service: learningCmsService.curriculums },
];

function buildPayload(resource: ResourceKey, values: any) {
  if (resource === "levels") {
    return {
      code: values.code,
      name: values.name,
      rank: Number(values.rank || 0),
    };
  }

  if (resource === "exams") {
    return {
      code: values.code,
      title: values.title,
      description: values.description || undefined,
      timeLimitSeconds: Number(values.timeLimitMinutes || 0) * 60,
      status: values.status || "draft",
    };
  }

  if (resource === "curriculums") {
    return {
      code: values.code,
      title: values.title,
      description: values.description || undefined,
      levelId: values.levelId || undefined,
      status: values.status || "draft",
    };
  }

  return {
    code: values.code,
    name: values.name,
    description: values.description || undefined,
    parentId: resource === "topics" ? values.parentId || undefined : undefined,
  };
}

export default function AdminCourses() {
  const [activeKey, setActiveKey] = useState<ResourceKey>("levels");
  const [rows, setRows] = useState<Record<ResourceKey, CmsRow[]>>({
    levels: [],
    skills: [],
    topics: [],
    tags: [],
    exams: [],
    curriculums: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const activeResource = useMemo(
    () => resources.find((resource) => resource.key === activeKey) || resources[0],
    [activeKey],
  );

  const loadResource = async (resource = activeResource) => {
    try {
      setIsLoading(true);
      const result = await resource.service.list({ page: 1, limit: 100, isActive: true });
      setRows((prev) => ({
        ...prev,
        [resource.key]: result.data as CmsRow[],
      }));
    } catch (error) {
      message.error(error instanceof Error ? error.message : `Khong the tai ${resource.label}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadResource(activeResource);
  }, [activeResource]);

  const handleCreate = async (values: any) => {
    try {
      setIsLoading(true);
      await activeResource.service.create(buildPayload(activeKey, values));
      message.success("Tao moi thanh cong");
      setModalOpen(false);
      form.resetFields();
      await loadResource(activeResource);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Khong the tao moi");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async (row: CmsRow) => {
    if (!activeResource.service.updateStatus) return;

    try {
      setIsLoading(true);
      await activeResource.service.updateStatus(row.id, { status: "published" });
      message.success("Da publish");
      await loadResource(activeResource);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Khong the publish");
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    {
      title: "Code",
      dataIndex: "code",
      render: (value: string | undefined) => value || "-",
    },
    {
      title: "Name / Title",
      render: (_: unknown, row: CmsRow) => row.name || row.title || "-",
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (value: string | undefined) => (value ? <Tag color={value === "published" ? "green" : "blue"}>{value}</Tag> : "-"),
    },
    {
      title: "Meta",
      render: (_: unknown, row: CmsRow) =>
        activeKey === "levels"
          ? `Rank ${row.rank ?? "-"}`
          : activeKey === "exams"
            ? `${Math.ceil((row.timeLimitSeconds || 0) / 60)} minutes`
            : row.description || "-",
    },
    {
      title: "Actions",
      render: (_: unknown, row: CmsRow) =>
        activeResource.service.updateStatus && row.status !== "published" ? (
          <Button size="small" onClick={() => handlePublish(row)}>
            Publish
          </Button>
        ) : null,
    },
  ];

  return (
    <Card
      title="Learning CMS"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => loadResource()} loading={isLoading}>
            Reload
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Create
          </Button>
        </Space>
      }
    >
      <Tabs
        activeKey={activeKey}
        onChange={(key) => setActiveKey(key as ResourceKey)}
        items={resources.map((resource) => ({
          key: resource.key,
          label: resource.label,
          children: (
            <Table
              rowKey="id"
              loading={isLoading}
              dataSource={rows[resource.key]}
              columns={columns}
              pagination={{ pageSize: 10 }}
            />
          ),
        }))}
      />

      <Modal
        title={`Create ${activeResource.label}`}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={isLoading}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} initialValues={{ status: "draft" }}>
          <Form.Item name="code" label="Code" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          {activeKey === "exams" || activeKey === "curriculums" ? (
            <Form.Item name="title" label="Title" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          ) : (
            <Form.Item name="name" label="Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          )}

          {activeKey === "levels" && (
            <Form.Item name="rank" label="Rank" rules={[{ required: true }]}>
              <InputNumber className="w-full" min={0} />
            </Form.Item>
          )}

          {activeKey === "exams" && (
            <Form.Item name="timeLimitMinutes" label="Time limit (minutes)" rules={[{ required: true }]}>
              <InputNumber className="w-full" min={1} />
            </Form.Item>
          )}

          {activeKey === "curriculums" && (
            <Form.Item name="levelId" label="Level">
              <Select
                allowClear
                options={rows.levels.map((level) => ({
                  value: level.id,
                  label: level.name || level.code,
                }))}
              />
            </Form.Item>
          )}

          {(activeKey === "exams" || activeKey === "curriculums") && (
            <Form.Item name="status" label="Status">
              <Select
                options={[
                  { value: "draft", label: "Draft" },
                  { value: "published", label: "Published" },
                  { value: "archived", label: "Archived" },
                ]}
              />
            </Form.Item>
          )}

          {activeKey !== "levels" && (
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={3} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </Card>
  );
}
