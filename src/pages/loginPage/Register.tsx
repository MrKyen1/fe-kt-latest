import { Form, Input, Button, message } from "antd";
import { UserOutlined, MailOutlined, LockOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const navigate = useNavigate();

  const onFinish = () => {
    message.success("Đăng ký thành công! Vui lòng đăng nhập.");
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-sm">
        {/* LOGO */}
        <div className="flex justify-center mb-6">
          <img
            src="/src/assets/logo/logo.png"
            alt="Logo"
            className="h-14 object-contain"
          />
        </div>

        <h2 className="text-2xl font-semibold text-center mb-6">
          Đăng ký tài khoản
        </h2>

        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="username"
            rules={[{ required: true, message: "Nhập tên đăng nhập" }]}
          >
            <Input
              size="large"
              prefix={<UserOutlined />}
              placeholder="Tên đăng nhập"
            />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Nhập email" },
              { type: "email", message: "Email không hợp lệ" },
            ]}
          >
            <Input size="large" prefix={<MailOutlined />} placeholder="Email" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Nhập mật khẩu" }]}
          >
            <Input.Password
              size="large"
              prefix={<LockOutlined />}
              placeholder="Mật khẩu"
            />
          </Form.Item>

          <Form.Item
            name="confirm"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Xác nhận mật khẩu" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  return !value || getFieldValue("password") === value
                    ? Promise.resolve()
                    : Promise.reject("Mật khẩu không khớp");
                },
              }),
            ]}
          >
            <Input.Password
              size="large"
              prefix={<LockOutlined />}
              placeholder="Xác nhận mật khẩu"
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            className="w-full bg-blue-600 hover:bg-blue-700 mt-2"
          >
            ĐĂNG KÝ
          </Button>
        </Form>

        <p className="text-center text-sm text-gray-600 mt-4">
          Đã có tài khoản?
          <span
            className="text-blue-600 ml-1 cursor-pointer hover:underline"
            onClick={() => navigate("/login")}
          >
            Đăng nhập
          </span>
        </p>
      </div>
    </div>
  );
};

export default Register;
