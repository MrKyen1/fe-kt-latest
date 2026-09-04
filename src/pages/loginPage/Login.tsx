import { useNavigate } from "react-router-dom";
import { Form, Input, Button, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import loginImg from "../../assets/login/login.png";
import logoImg from "../../assets/logo/logo.png";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFinish = async (values: { username: string; password: string }) => {
    const { username, password } = values;
    setIsSubmitting(true);
    try {
      await login(username, password);
      message.success("Đăng nhập thành công!");
      navigate("/");
    } catch (error: any) {
      console.error("Login failed:", error);
      message.error(error?.message || "Tên đăng nhập hoặc mật khẩu không đúng.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ===== LEFT: IMAGE (2/3) ===== */}
      <div className="hidden md:flex w-2/3 items-center justify-center">
        <img
          src={loginImg}
          alt="Login Illustration"
          className="w-[80%] max-w-xl"
        />
      </div>

      {/* ===== RIGHT: FORM (1/3) ===== */}
      <div className="w-full md:w-1/3 bg-white flex items-center justify-center px-10">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img
              src={logoImg}
              alt="Logo"
              className="h-14 object-contain"
            />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
            Đăng nhập tài khoản
          </h2>

          {/* ===== FORM ===== */}
          <Form
            layout="vertical"
            onFinish={handleFinish} // Enter & Button deu chay
            requiredMark={false}
          >
            {/* Username */}
            <Form.Item
              name="username"
              rules={[
                { required: true, message: "Vui lòng nhập tên đăng nhập" },
              ]}
            >
              <Input
                size="large"
                prefix={<UserOutlined />}
                placeholder="Tên đăng nhập"
              />
            </Form.Item>

            {/* Password */}
            <Form.Item
              name="password"
              rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
            >
              <Input.Password
                size="large"
                prefix={<LockOutlined />}
                placeholder="Mật khẩu"
              />
            </Form.Item>

            {/* Remember + Forgot */}
            <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                Ghi nhớ
              </label>
              <span
                className="text-blue-600 cursor-pointer hover:underline"
                onClick={() => navigate("/forgot-password")}
              >
                Đổi mật khẩu tạm thời
              </span>
            </div>

            {/* Button */}
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                ĐĂNG NHẬP
              </Button>
            </Form.Item>
          </Form>

          {/* Register */}
          <p className="text-center text-sm text-gray-600 mt-4">
            Bạn chưa có tài khoản?
            <span
              className="text-blue-600 ml-1 cursor-pointer hover:underline"
            >
              Liên hệ với quản lý trung tâm.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
