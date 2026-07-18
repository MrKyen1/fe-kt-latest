import { Layout, Menu, Typography } from "antd";

const { Sider, Content, Header } = Layout;
const { Title } = Typography;

interface Props {
  menuItems: any[];
  selectedKey: string;
  onChange: (key: string) => void;
  children: React.ReactNode;
}

export default function ProfileLayout({
  menuItems,
  selectedKey,
  onChange,
  children,
}: Props) {
  return (
    <Layout style={{ minHeight: "100vh", overflow: "visible" }}>
      <Sider
        width={250}
        breakpoint="lg"
        collapsedWidth={0}
        theme="light"
        style={{
          position: "sticky",
          top: "64px",
          height: "calc(100vh - 64px)",
          overflowY: "auto",
          background: "#f0f2f5",
          borderRight: "1px solid #d9d9d9",
        }}
      >
        <h1 className="text-xl font-bold p-4 text-blue-600">Kata Admin</h1>

        <Menu
          items={menuItems}
          selectedKeys={[selectedKey]}
          onClick={(e) => onChange(e.key)}
          style={{ borderRight: "none" }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: "#fff",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Title level={3} className="!mb-0">
            {menuItems.find((item) => item.key === selectedKey)?.label}
          </Title>
        </Header>

        <Content
          style={{
            padding: "24px",
            background: "#fafafa",
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
