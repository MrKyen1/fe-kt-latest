import { Modal, message } from "antd";
import { getErrorMessage } from "../services/apiClient";

interface ConfirmWithImpactOptions {
  title: string;
  run: (confirm: boolean) => Promise<unknown>;
  okText?: string;
  successText?: string;
  onDone?: () => void;
}

/**
 * Deactivating never blocks: the server first answers with what will stop
 * (CONFIRM_REQUIRED + details.impacts), the user reads it, then we repeat
 * the call with confirm=true.
 */
export async function confirmWithImpact({ title, run, okText = "Ngừng hoạt động", successText, onDone }: ConfirmWithImpactOptions) {
  const finish = () => {
    if (successText) message.success(successText);
    onDone?.();
  };
  try {
    await run(false);
    finish();
  } catch (error: any) {
    if (error?.errorCode !== "CONFIRM_REQUIRED") {
      message.error(getErrorMessage(error, "Thao tác thất bại"), 5);
      return;
    }
    const impacts: string[] = error.details?.impacts ?? [];
    Modal.confirm({
      title,
      width: 520,
      content: impacts.length ? (
        <ul className="list-disc pl-5 space-y-1 text-slate-600">
          {impacts.map((line) => <li key={line}>{line}</li>)}
        </ul>
      ) : (
        <span className="text-slate-600">Không có dữ liệu đang hoạt động nào bị ảnh hưởng.</span>
      ),
      okText,
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await run(true);
          finish();
        } catch (confirmError) {
          message.error(getErrorMessage(confirmError, "Thao tác thất bại"), 5);
        }
      },
    });
  }
}
