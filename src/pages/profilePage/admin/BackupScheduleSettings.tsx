import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { SettingOutlined } from "@ant-design/icons";
import {
  getBackupSettings,
  updateBackupSettings,
  type BackupSettingsOverview,
} from "../../../services/backups";

const SCHEDULES = [
  { value: "hourly", label: "Mỗi giờ" },
  {
    value: "*-*-* 00,02,04,06,08,10,12,14,16,18,20,22:00:00 UTC",
    label: "Mỗi 2 giờ",
  },
  { value: "*-*-* 00,04,08,12,16,20:00:00 UTC", label: "Mỗi 4 giờ" },
  { value: "*-*-* 00,06,12,18:00:00 UTC", label: "Mỗi 6 giờ (mặc định)" },
  { value: "*-*-* 00,12:00:00 UTC", label: "Mỗi 12 giờ" },
  { value: "daily-local", label: "Hằng ngày, chọn giờ Việt Nam" },
  { value: "custom", label: "Lịch tùy chỉnh (nâng cao)" },
];

function describeSchedule(schedule: string) {
  const daily = /^\*-\*-\* (\d{2}:\d{2}):00 Asia\/Ho_Chi_Minh$/.exec(schedule);
  if (daily) return `Hằng ngày lúc ${daily[1]} (giờ Việt Nam)`;
  return (
    SCHEDULES.find((option) => option.value === schedule)?.label ?? schedule
  );
}

export default function BackupScheduleSettings({
  enabled,
}: {
  enabled: boolean;
}) {
  const { message } = App.useApp();
  const [overview, setOverview] = useState<BackupSettingsOverview | null>(null);
  const [preset, setPreset] = useState(SCHEDULES[3].value);
  const [dailyTime, setDailyTime] = useState("02:00");
  const [custom, setCustom] = useState("");
  const [keepLast, setKeepLast] = useState<number | null>(12);
  const [confirmation, setConfirmation] = useState<{
    schedule: string;
    keepLast: number;
  } | null>(null);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const dirty = useRef(false);
  const mounted = useRef(true);
  const fetching = useRef(false);
  const submitted = useRef<string | null>(null);

  const populate = useCallback((value: BackupSettingsOverview["applied"]) => {
    const daily = /^\*-\*-\* (\d{2}:\d{2}):00 Asia\/Ho_Chi_Minh$/.exec(
      value.schedule,
    );
    if (daily) {
      setPreset("daily-local");
      setDailyTime(daily[1]);
    } else if (SCHEDULES.some((option) => option.value === value.schedule))
      setPreset(value.schedule);
    else {
      setPreset("custom");
      setCustom(value.schedule);
    }
    setKeepLast(value.keepLast);
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled || !mounted.current || fetching.current) return;
    fetching.current = true;
    try {
      const next = await getBackupSettings();
      if (!mounted.current) return;
      if (
        submitted.current &&
        !next.pending &&
        next.applied.id === submitted.current
      ) {
        dirty.current = false;
        submitted.current = null;
      }
      if (!dirty.current && !next.pending) populate(next.applied);
      setOverview(next);
      setConnectionError(false);
    } catch {
      if (mounted.current) setConnectionError(true);
    } finally {
      fetching.current = false;
    }
  }, [enabled, populate]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 5_000);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
    };
  }, [refresh]);

  const schedule =
    preset === "daily-local"
      ? `*-*-* ${dailyTime}:00 Asia/Ho_Chi_Minh`
      : preset === "custom"
        ? custom.trim()
        : preset;
  const pending = !!overview?.pending;
  const disabled =
    !enabled || !overview || pending || saving || connectionError;

  const openConfirmation = () => {
    if (
      !schedule ||
      !/^[A-Za-z0-9*,:./_+ -]{1,160}$/.test(schedule) ||
      (preset === "daily-local" &&
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(dailyTime)) ||
      keepLast === null ||
      !Number.isInteger(keepLast) ||
      keepLast < 1 ||
      keepLast > 365
    ) {
      void message.error("Chọn lịch hợp lệ và số bản giữ lại từ 1 đến 365.");
      return;
    }
    setPassword("");
    setConfirmation({ schedule, keepLast });
  };

  const save = async () => {
    if (!confirmation || !password || saving) return;
    setSaving(true);
    try {
      const result = await updateBackupSettings(
        confirmation.schedule,
        confirmation.keepLast,
        password,
      );
      if (!mounted.current) return;
      submitted.current = result.id;
      setOverview(
        (value) =>
          value && {
            ...value,
            pending: { id: result.id, ...confirmation },
            status: { state: "pending" },
          },
      );
      setConfirmation(null);
      void message.success(
        "Đã gửi cấu hình. Máy chủ sẽ kiểm tra và áp dụng trong nền.",
      );
    } catch (error) {
      if (mounted.current)
        void message.error(
          error instanceof Error ? error.message : "Không lưu được cấu hình.",
        );
    } finally {
      if (mounted.current) {
        setSaving(false);
        setPassword("");
      }
    }
  };

  return (
    <Card
      size="small"
      title={
        <Space>
          <SettingOutlined />
          Cấu hình backup trên VPS
        </Space>
      }
    >
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        <Typography.Paragraph>
          Chọn lịch tự tạo backup trên máy chủ và số bản cần giữ. Các máy
          Windows vẫn tải theo lịch riêng của công cụ đã cài.
        </Typography.Paragraph>
        {overview && (
          <Typography.Text>
            {overview.applied.installed
              ? "Cấu hình đã được VPS xác nhận:"
              : "Cấu hình ban đầu:"}{" "}
            <Typography.Text>
              {describeSchedule(overview.applied.schedule)}
            </Typography.Text>
            {" · Giữ "}
            {overview.applied.keepLast} bản gần nhất.
          </Typography.Text>
        )}
        {overview && !overview.applied.installed && (
          <Alert
            type="warning"
            showIcon
            title="Lịch tự động chưa được xác nhận trên VPS"
            description="Lưu cấu hình để yêu cầu máy chủ cài và bật lịch backup tự động."
          />
        )}
        {connectionError && (
          <Alert
            type="info"
            showIcon
            title="Chưa cập nhật được trạng thái cấu hình"
            description="Trang sẽ tự kiểm tra lại khi máy chủ sẵn sàng."
          />
        )}
        {pending && (
          <Alert
            type="info"
            showIcon
            title={
              overview?.status.state === "applying"
                ? "Máy chủ đang áp dụng cấu hình"
                : "Cấu hình đang chờ áp dụng"
            }
            description="Cấu hình chỉ có hiệu lực sau khi máy chủ xác nhận. Nếu chờ quá lâu, hãy liên hệ người vận hành."
          />
        )}
        {!pending && overview?.status.state === "failed" && (
          <Alert
            type="error"
            showIcon
            title="Chưa áp dụng được cấu hình"
            description={
              overview.status.message ||
              "Kiểm tra lịch hoặc liên hệ người vận hành."
            }
          />
        )}
        {!pending && overview?.status.state === "applied" && (
          <Tag color="success">Máy chủ đã xác nhận cấu hình</Tag>
        )}
        <label htmlFor="backup-schedule-preset">Tần suất tạo backup</label>
        <Select
          id="backup-schedule-preset"
          options={SCHEDULES}
          value={preset}
          disabled={disabled}
          style={{ width: "100%" }}
          onChange={(value) => {
            dirty.current = true;
            setPreset(value);
          }}
        />
        {preset === "daily-local" && (
          <Space>
            <Typography.Text>Giờ Việt Nam:</Typography.Text>
            <Input
              type="time"
              aria-label="Giờ backup hằng ngày"
              value={dailyTime}
              disabled={disabled}
              onChange={(event) => {
                dirty.current = true;
                setDailyTime(event.target.value);
              }}
            />
          </Space>
        )}
        {preset === "custom" && (
          <Input
            aria-label="Lịch backup tùy chỉnh theo systemd OnCalendar"
            value={custom}
            maxLength={160}
            placeholder="Ví dụ: *-*-* 02:00:00 Asia/Ho_Chi_Minh"
            disabled={disabled}
            onChange={(event) => {
              dirty.current = true;
              setCustom(event.target.value);
            }}
          />
        )}
        <label htmlFor="backup-keep-last">
          Số bản giữ lại trên VPS (1–365)
        </label>
        <InputNumber
          id="backup-keep-last"
          min={1}
          max={365}
          precision={0}
          value={keepLast}
          disabled={disabled}
          onChange={(value) => {
            dirty.current = true;
            setKeepLast(value);
          }}
        />
        <Typography.Text type="secondary">
          Mỗi lần tạo backup có thể bảo trì ngắn; nên chọn giờ ít người dùng.
          Luôn giữ thêm bản mà phiên bản website đang chạy tham chiếu. Giảm số
          bản sẽ dọn các bản cũ ở lần backup thành công tiếp theo, không xóa
          ngay khi lưu.
        </Typography.Text>
        <Space wrap>
          <Button type="primary" disabled={disabled} onClick={openConfirmation}>
            Lưu cấu hình VPS
          </Button>
          <Button
            disabled={disabled}
            onClick={() => {
              if (overview) {
                dirty.current = false;
                populate(overview.applied);
              }
            }}
          >
            Dùng cấu hình hiện tại
          </Button>
        </Space>
      </Space>
      <Modal
        open={confirmation !== null}
        title="Xác nhận thay đổi cấu hình backup VPS"
        okText="Lưu cấu hình"
        cancelText="Hủy"
        confirmLoading={saving}
        okButtonProps={{ disabled: !password }}
        closable={!saving}
        maskClosable={!saving}
        onOk={() => {
          void save();
        }}
        onCancel={() => {
          if (!saving) {
            setConfirmation(null);
            setPassword("");
          }
        }}
      >
        <Typography.Paragraph>
          Lịch mới:{" "}
          <Typography.Text>
            {confirmation && describeSchedule(confirmation.schedule)}
          </Typography.Text>
          . Giữ {confirmation?.keepLast} bản gần nhất. Bản cũ vượt giới hạn được
          dọn ở lần backup thành công tiếp theo.
        </Typography.Paragraph>
        <Input.Password
          aria-label="Mật khẩu xác nhận cấu hình backup"
          autoComplete="current-password"
          maxLength={1024}
          placeholder="Mật khẩu admin hiện tại"
          value={password}
          disabled={saving}
          onChange={(event) => setPassword(event.target.value)}
          onPressEnter={() => {
            void save();
          }}
        />
      </Modal>
    </Card>
  );
}
