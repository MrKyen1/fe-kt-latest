import { Form, Input, Button, message } from "antd";
import { MailOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const ForgotPassword = () => {
  const navigate = useNavigate();

  const onFinish = (values: { email: string }) => {
    message.success(`Link đặt lại mật khẩu đã được gửi tới ${values.email}`);
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
          Quên mật khẩu
        </h2>

        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Vui lòng nhập email" },
              { type: "email", message: "Email không hợp lệ" },
            ]}
          >
            <Input
              size="large"
              prefix={<MailOutlined />}
              placeholder="Nhập email của bạn"
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            GỬI LINK KHÔI PHỤC
          </Button>
        </Form>

        <p className="text-center text-sm text-gray-600 mt-4">
          Nhớ mật khẩu rồi?
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

export default ForgotPassword;
