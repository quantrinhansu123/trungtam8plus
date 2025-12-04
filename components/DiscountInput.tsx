import React, { useRef } from "react";
import { InputNumber, Space } from "antd";

interface DiscountInputProps {
  record: any;
  updateStudentDiscount: (invoiceId: string, discount: number) => Promise<void>;
}

const DiscountInput: React.FC<DiscountInputProps> = ({
  record,
  updateStudentDiscount,
}) => {
  const inputRef = useRef<any>(null);
  const valueRef = useRef<number>(record.discount);
  const isPaid = record.status === "paid";

  const handleChange = (value: number | null) => {
    const numValue = value ?? 0;
    console.log("📝 Value changed to:", numValue);
    valueRef.current = numValue;
  };

  const handleSave = () => {
    // Lấy giá trị từ input element
    const currentValue = inputRef.current?.value ?? valueRef.current;
    console.log("🔘 Enter pressed, input value:", inputRef.current?.value);
    console.log("🔘 Ref value:", valueRef.current);
    console.log("🔘 Final value to save:", currentValue);
    console.log("🔘 Is paid?", isPaid);

    if (isPaid) {
      console.log("❌ Cannot update - invoice is paid");
      return;
    }

    updateStudentDiscount(record.id, currentValue);
  };

  return (
    <Space.Compact style={{ width: "100%" }}>
      <InputNumber
        ref={inputRef}
        key={record.discount} // Force re-render when discount changes
        defaultValue={record.discount}
        min={0}
        max={record.totalAmount}
        onChange={handleChange}
        onPressEnter={handleSave}
        style={{ width: "100%" }}
        size="small"
        disabled={isPaid}
        placeholder={isPaid ? "Đã thu" : "0"}
      />
    </Space.Compact>
  );
};

export default DiscountInput;
