import { Form, Input, Button, message } from "antd";
import { UserOutlined, LockOutlined, KeyOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { authService } from "../../services/authService";
import { tokenStorage } from "../../services/tokenStorage";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFinish = async (values: any) => {
    const { username, tempPassword, newPassword, confirmPassword } = values;

    if (newPassword !== confirmPassword) {
      message.error("Mật khẩu mới và xác nhận mật khẩu không khớp.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Step 1: Login using temporary credentials to get access token
      const session = await authService.login({
        identifier: username,
        password: tempPassword,
      });

      // Step 2: Call the changePassword API with the temporary token
      await authService.changePassword({
        currentPassword: tempPassword,
        newPassword: newPassword,
      });

      // Step 3: Clear the temporary session tokens
      tokenStorage.clear();

      message.success("Đổi mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới.");
      navigate("/login");
    } catch (error: any) {
      console.error("Password reset flow failed:", error);
      tokenStorage.clear();
      message.error(error?.message || "Đổi mật khẩu thất bại. Vui lòng kiểm tra lại thông tin cấp bởi Admin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ===== LEFT: IMAGE (2/3) ===== */}
      <div className="hidden md:flex w-2/3 items-center justify-center bg-gray-50">
        <img
          src="src/assets/login/login.png"
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
              src="/src/assets/logo/logo.png"
              alt="Logo"
              className="h-14 object-contain"
            />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-semibold text-center text-gray-800 mb-2">
            Đổi mật khẩu tài khoản
          </h2>
          <p className="text-center text-sm text-slate-400 mb-6">
            Dành cho tài khoản được Admin cấp mật khẩu tạm thời
          </p>

          {/* ===== FORM ===== */}
          <Form
            layout="vertical"
            onFinish={handleFinish}
            requiredMark={false}
          >
            {/* Username / Code */}
            <Form.Item
              name="username"
              rules={[
                { required: true, message: "Vui lòng nhập tên đăng nhập" },
              ]}
            >
              <Input
                size="large"
                prefix={<UserOutlined className="text-slate-400" />}
                placeholder="Tên đăng nhập / Mã học sinh"
              />
            </Form.Item>

            {/* Temporary Password */}
            <Form.Item
              name="tempPassword"
              rules={[
                { required: true, message: "Vui lòng nhập mật khẩu tạm thời được cấp" },
              ]}
            >
              <Input.Password
                size="large"
                prefix={<KeyOutlined className="text-slate-400" />}
                placeholder="Mật khẩu tạm thời"
              />
            </Form.Item>

            {/* New Password */}
            <Form.Item
              name="newPassword"
              rules={[
                { required: true, message: "Vui lòng nhập mật khẩu mới" },
                { min: 8, message: "Mật khẩu mới phải dài tối thiểu 8 ký tự" },
              ]}
            >
              <Input.Password
                size="large"
                prefix={<LockOutlined className="text-slate-400" />}
                placeholder="Mật khẩu mới"
              />
            </Form.Item>

            {/* Confirm New Password */}
            <Form.Item
              name="confirmPassword"
              dependencies={["newPassword"]}
              rules={[
                { required: true, message: "Vui lòng xác nhận mật khẩu mới" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("newPassword") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error("Mật khẩu xác nhận không khớp!"));
                  },
                }),
              ]}
            >
              <Input.Password
                size="large"
                prefix={<LockOutlined className="text-slate-400" />}
                placeholder="Xác nhận mật khẩu mới"
              />
            </Form.Item>

            {/* Button */}
            <Form.Item className="mt-6">
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 font-semibold"
              >
                CẬP NHẬT MẬT KHẨU
              </Button>
            </Form.Item>
          </Form>

          {/* Back to login */}
          <p className="text-center text-sm text-gray-600 mt-4">
            Quay lại trang
            <span
              className="text-blue-600 ml-1 cursor-pointer hover:underline font-medium"
              onClick={() => navigate("/login")}
            >
              Đăng nhập
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
