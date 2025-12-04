import React, { useState, useRef } from "react";
import domtoimage from "dom-to-image-more";
import {
  Button,
  Input,
  Tabs,
  Form,
  Card,
  Row,
  Col,
  Typography,
  Space,
  message,
} from "antd";
import {
  DownloadOutlined,
  MoneyCollectOutlined,
  PayCircleOutlined,
} from "@ant-design/icons";

const { TextArea } = Input;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

const COLORS = {
  default: "#36797f",
  dark: "#36797f",
  light: "#a2e1e6",
};

interface TuitionData {
  studentName: string;
  month: string;
  totalSessions: number;
  pricePerSession: string;
  totalAmount: string;
  note: string;
}

interface SalaryData {
  teacherName: string;
  month: string;
  subject: string;
  caTH: string;
  luongTH: string;
  caTHCS: string;
  luongTHCS: string;
  caTHPT: string;
  luongTHPT: string;
  tongLuong: string;
  note: string;
  // VietQR config
  bankId?: string;
  accountNo?: string;
  accountName?: string;
}

// Generate VietQR URL with hardcoded bank info
const generateVietQR = (
  amount: string,
  studentName: string,
  month: string
): string => {
  const bankId = "VPB"; // VPBank
  const accountNo = "4319888";
  const accountName = "NGUYEN THI HOA";
  const numericAmount = amount.replace(/[^0-9]/g, "");
  const description = `HP T${month} ${studentName}`;
  return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact.png?amount=${numericAmount}&addInfo=${encodeURIComponent(
    description
  )}&accountName=${encodeURIComponent(accountName)}`;
};

// Helper function to export as image
const exportAsImage = async (element: HTMLElement, filename: string) => {
  try {
    console.log("Starting export...");

    // Use the statically imported domtoimage (pre-bundled by Vite).
    // If for some reason it's not available, attempt a dynamic import as a fallback.
    const impl =
      (domtoimage as any) || (await import("dom-to-image-more")).default;

    if (!impl || typeof impl.toBlob !== "function") {
      throw new Error("dom-to-image-more is not available in this environment");
    }

    // Convert to blob. Measure element and apply scale so the full area is captured
    const rect = element.getBoundingClientRect();
    const scale = 2; // increase for higher-resolution output
    const width = Math.round(rect.width * scale);
    const height = Math.round(rect.height * scale);

    const blob = await impl.toBlob(element, {
      bgcolor: "#ffffff",
      quality: 1,
      // supply scaled pixel dimensions to the library
      width,
      height,
      // keep the visual size the same while scaling the rendering
      style: {
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        width: `${Math.round(rect.width)}px`,
        height: `${Math.round(rect.height)}px`,
      },
      // make the canvas used by dom-to-image-more high-DPI aware
      // (some versions support 'canvas' or 'canvasWidth' options; leaving defaults)
    });

    console.log("Image created successfully");

    // Download
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = filename;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log("Image downloaded successfully");
  } catch (error) {
    console.error("Error exporting image:", error);
    message.error(
      `Lỗi khi xuất ảnh: ${
        error instanceof Error ? error.message : "Không xác định"
      }\n\nThử refresh lại trang, xóa cache dev server (node_modules/.vite) và khởi động lại dev server!`
    );
  }
};

export const TuitionReceipt: React.FC<{
  data: TuitionData;
  onExport: () => void;
}> = ({ data, onExport }) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (receiptRef.current) {
      try {
        setIsExporting(true);
        await exportAsImage(
          receiptRef.current,
          `Hoc_Phi_${data.studentName.replace(/\s+/g, "_")}_Thang_${
            data.month
          }.png`
        );
        onExport();
      } catch (error) {
        console.error("Export failed:", error);
      } finally {
        setIsExporting(false);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto my-6">
      <div className="mb-4 flex justify-end">
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={handleExport}
          loading={isExporting}
          style={{ backgroundColor: "#36797f" }}
        >
          {isExporting ? "Đang xuất..." : "📸 Xuất ảnh"}
        </Button>
      </div>

      <div
        ref={receiptRef}
        className="bg-white rounded-lg shadow-md border relative overflow-hidden"
        style={{ borderColor: COLORS.dark, minWidth: "700px" }}
      >
        {/* Background Logo */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src="/img/logo.png"
            alt="Background Logo"
            onError={(e) => console.error("Logo load failed:", e)}
            onLoad={() => console.log("Logo loaded successfully")}
            style={{
              width: "auto",
              height: "400px",
              maxWidth: "400px",
              objectFit: "contain",
              opacity: 1,
              filter: "grayscale(20%) brightness(1.1)",
              userSelect: "none",
              pointerEvents: "none",
            }}
          />
        </div>

        <div
          className="p-8 relative"
          style={{ zIndex: 10, position: "relative" }}
        >
          <Title level={2} style={{ textAlign: "center", color: "#36797f" }}>
            PHIẾU THU HỌC PHÍ THÁNG {data.month}
          </Title>
          <div
            className="mt-6 border rounded overflow-hidden"
            style={{ borderColor: COLORS.default, background: "transparent" }}
          >
            <div
              className="bg-[${COLORS.default}]"
              style={{ background: "transparent" }}
            />
            <div
              className="bg-[#f7fafc] p-4"
              style={{ background: "rgba(255, 255, 255, 0.85)" }}
            >
              <div className="bg-[" style={{ background: "transparent" }} />
              <div
                className="bg-yellow-300 p-2 text-center font-semibold text-lg"
                style={{ background: COLORS.default, color: "#fff" }}
              >
                <Text strong style={{ color: "#fff", fontSize: 18 }}>
                  {data.studentName}
                </Text>
              </div>

              <table className="w-full text-sm mt-4 table-fixed border-collapse">
                <thead>
                  <tr>
                    <th className="border p-4 text-sm">Tháng</th>
                    <th className="border p-4 text-sm">Tổng số buổi học</th>
                    <th className="border p-4 text-sm">Học phí/buổi</th>
                    <th className="border p-4 text-sm">Học phí hoàn thành</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border p-4 text-center">{data.month}</td>
                    <td className="border p-4 text-center">
                      {data.totalSessions}
                    </td>
                    <td className="border p-4 text-center">
                      {data.pricePerSession}
                    </td>
                    <td className="border p-4 text-center">
                      {data.totalAmount}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-6 p-4 flex items-start gap-6">
                <div className="flex-1 text-sm text-gray-700 space-y-2">
                  <p>🌼{data.note}</p>
                  <p>🌼Em cảm ơn Quý phụ huynh ạ!</p>
                </div>
                <div className="w-48 h-48 bg-white border flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    src={generateVietQR(
                      data.totalAmount,
                      data.studentName,
                      data.month
                    )}
                    alt="VietQR Code"
                    className="w-full h-full object-contain"
                    crossOrigin="anonymous"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SalarySlip: React.FC<{
  data: SalaryData;
  onExport: () => void;
}> = ({ data, onExport }) => {
  const salaryRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (salaryRef.current) {
      try {
        setIsExporting(true);
        await exportAsImage(
          salaryRef.current,
          `Phieu_Luong_${data.teacherName.replace(/\s+/g, "_")}_Thang_${
            data.month
          }.png`
        );
        onExport();
      } catch (error) {
        console.error("Export failed:", error);
      } finally {
        setIsExporting(false);
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto my-6">
      <div className="mb-4 flex justify-end">
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={handleExport}
          loading={isExporting}
          style={{ backgroundColor: "#36797f" }}
        >
          {isExporting ? "Đang xuất..." : "📸 Xuất ảnh"}
        </Button>
      </div>

      <div
        ref={salaryRef}
        className="bg-white rounded-lg shadow-md border relative overflow-hidden"
        style={{ borderColor: COLORS.dark }}
      >
        {/* Background Logo */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src="/img/logo.png"
            alt="Background Logo"
            style={{
              width: "auto",
              height: "300px",
              maxWidth: "300px",
              objectFit: "contain",
              opacity: 0.15,
              filter: "grayscale(20%) brightness(1.1)",
              userSelect: "none",
              pointerEvents: "none",
            }}
          />
        </div>

        <div
          className="p-6 relative"
          style={{ zIndex: 10, position: "relative" }}
        >
          <Title level={3} style={{ textAlign: "center", color: "#36797f" }}>
            PHIẾU LƯƠNG THÁNG {data.month}
          </Title>
          <Text
            style={{
              display: "block",
              textAlign: "center",
              fontSize: 16,
              fontWeight: "bold",
              marginTop: 8,
            }}
          >
            Họ và tên: {data.teacherName}
          </Text>

          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
            <div
              className="col-span-1 p-2 bg-["
              style={{ background: COLORS.light }}
            >
              <div className="font-semibold">Khối</div>
            </div>
            <div className="col-span-1 p-2 border">Ca dạy</div>
            <div className="col-span-1 p-2 border">Lương</div>

            <div className="p-2 font-bold text-center">TH</div>
            <div className="p-2 text-center">{data.caTH}</div>
            <div className="p-2 text-center">{data.luongTH}</div>

            <div className="p-2 font-bold text-center">THCS</div>
            <div className="p-2 text-center">{data.caTHCS}</div>
            <div className="p-2 text-center">{data.luongTHCS}</div>

            <div className="p-2 font-bold text-center">THPT</div>
            <div className="p-2 text-center">{data.caTHPT}</div>
            <div className="p-2 text-center">{data.luongTHPT}</div>

            <div className="col-span-2 p-2 font-semibold">TỔNG LƯƠNG</div>
            <div className="p-2 font-bold text-center">{data.tongLuong}</div>
          </div>

          <div className="mt-4">
            <Text style={{ fontSize: 14, color: "#666" }}>
              Ghi chú: {data.note}
            </Text>
          </div>
          <div className="mt-2">
            <Text style={{ fontSize: 14, fontWeight: "500" }}>
              Thầy Cô kiểm tra kỹ thông tin và tiền lương. Nếu có sai sót báo
              lại với Trung Tâm
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
};

const Receipts: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"tuition" | "salary">("tuition");

  // Tuition form state
  const [tuitionData, setTuitionData] = useState<TuitionData>({
    studentName: "Con Phạm Hữu Minh",
    month: "10",
    totalSessions: 9,
    pricePerSession: "150,000",
    totalAmount: "1,350,000",
    note: "Phụ huynh vui lòng hoàn thành học phí cho con bằng cách quét mã QR.",
  });

  // Salary form state
  const [salaryData, setSalaryData] = useState<SalaryData>({
    teacherName: "Nguyễn Văn A",
    month: "10",
    subject: "Tiếng Anh",
    caTH: "10",
    luongTH: "500,000",
    caTHCS: "8",
    luongTHCS: "400,000",
    caTHPT: "6",
    luongTHPT: "300,000",
    tongLuong: "1,200,000",
    note: "Thầy Cô kiểm tra kỹ thông tin và tiền lương.",
  });

  // Calculate total amount for tuition
  const calculateTuitionTotal = () => {
    const sessions = Number(tuitionData.totalSessions) || 0;
    const price =
      Number(tuitionData.pricePerSession.replace(/[^0-9]/g, "")) || 0;
    const total = sessions * price;
    setTuitionData({
      ...tuitionData,
      totalAmount: total.toLocaleString("vi-VN"),
    });
  };

  // Calculate total salary
  const calculateSalaryTotal = () => {
    const th = Number(salaryData.luongTH.replace(/[^0-9]/g, "")) || 0;
    const thcs = Number(salaryData.luongTHCS.replace(/[^0-9]/g, "")) || 0;
    const thpt = Number(salaryData.luongTHPT.replace(/[^0-9]/g, "")) || 0;
    const total = th + thcs + thpt;
    setSalaryData({
      ...salaryData,
      tongLuong: total.toLocaleString("vi-VN"),
    });
  };

  return (
    <Card style={{ marginBottom: 32 }}>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as "tuition" | "salary")}
        type="card"
      >
        <TabPane
          tab={
            <Space>
              <MoneyCollectOutlined />
              Phiếu Thu Học Phí
            </Space>
          }
          key="tuition"
        >
          <div className="p-6">
            <div className="space-y-8">
              {/* Form */}
              <div className="space-y-4">
                <Title level={4} style={{ color: "#36797f", marginBottom: 16 }}>
                  📝 Nhập thông tin học phí
                </Title>

                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <div>
                      <Text
                        strong
                        style={{ display: "block", marginBottom: 8 }}
                      >
                        Tên học sinh
                      </Text>
                      <Input
                        value={tuitionData.studentName}
                        onChange={(e) =>
                          setTuitionData({
                            ...tuitionData,
                            studentName: e.target.value,
                          })
                        }
                        placeholder="VD: Con Phạm Hữu Minh"
                      />
                    </div>
                  </Col>

                  <Col xs={24} md={12}>
                    <div>
                      <Text
                        strong
                        style={{ display: "block", marginBottom: 8 }}
                      >
                        Tháng
                      </Text>
                      <Input
                        value={tuitionData.month}
                        onChange={(e) =>
                          setTuitionData({
                            ...tuitionData,
                            month: e.target.value,
                          })
                        }
                        placeholder="VD: 10"
                      />
                    </div>
                  </Col>
                </Row>

                <Row gutter={[16, 16]}>
                  <Col xs={24} md={8}>
                    <div>
                      <Text
                        strong
                        style={{ display: "block", marginBottom: 8 }}
                      >
                        Tổng số buổi học
                      </Text>
                      <Input
                        type="number"
                        value={tuitionData.totalSessions}
                        onChange={(e) =>
                          setTuitionData({
                            ...tuitionData,
                            totalSessions: Number(e.target.value),
                          })
                        }
                        onBlur={calculateTuitionTotal}
                        placeholder="VD: 9"
                      />
                    </div>
                  </Col>

                  <Col xs={24} md={8}>
                    <div>
                      <Text
                        strong
                        style={{ display: "block", marginBottom: 8 }}
                      >
                        Học phí/buổi (VNĐ)
                      </Text>
                      <Input
                        value={tuitionData.pricePerSession}
                        onChange={(e) =>
                          setTuitionData({
                            ...tuitionData,
                            pricePerSession: e.target.value,
                          })
                        }
                        onBlur={calculateTuitionTotal}
                        placeholder="VD: 150,000"
                      />
                    </div>
                  </Col>

                  <Col xs={24} md={8}>
                    <div>
                      <Text
                        strong
                        style={{ display: "block", marginBottom: 8 }}
                      >
                        Tổng học phí (VNĐ)
                      </Text>
                      <Input
                        value={tuitionData.totalAmount}
                        readOnly
                        style={{ fontWeight: "bold", color: "#36797f" }}
                      />
                    </div>
                  </Col>
                </Row>

                <div>
                  <Text strong style={{ display: "block", marginBottom: 8 }}>
                    Ghi chú
                  </Text>
                  <TextArea
                    rows={3}
                    value={tuitionData.note}
                    onChange={(e) =>
                      setTuitionData({ ...tuitionData, note: e.target.value })
                    }
                    placeholder="Ghi chú cho phụ huynh..."
                  />
                </div>
              </div>

              {/* Preview */}
              <div>
                <Title level={4} style={{ color: "#36797f", marginBottom: 16 }}>
                  👁️ Xem trước phiếu thu
                </Title>
                <TuitionReceipt
                  data={{
                    ...tuitionData,
                    pricePerSession: `${tuitionData.pricePerSession} Đ`,
                    totalAmount: `${tuitionData.totalAmount} Đ`,
                  }}
                  onExport={() => {
                    message.success("Đã xuất ảnh thành công!");
                  }}
                />
              </div>
            </div>
          </div>
        </TabPane>
        <TabPane
          tab={
            <Space>
              <PayCircleOutlined />
              Phiếu Lương Giáo Viên
            </Space>
          }
          key="salary"
        >
          <div className="p-6">
            <div className="space-y-8">
              {/* Form */}
              <div className="space-y-4">
                <Title level={4} style={{ color: "#36797f", marginBottom: 16 }}>
                  📝 Nhập thông tin lương
                </Title>

                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <div>
                      <Text
                        strong
                        style={{ display: "block", marginBottom: 8 }}
                      >
                        Tên giáo viên
                      </Text>
                      <Input
                        value={salaryData.teacherName}
                        onChange={(e) =>
                          setSalaryData({
                            ...salaryData,
                            teacherName: e.target.value,
                          })
                        }
                        placeholder="VD: Nguyễn Văn A"
                      />
                    </div>
                  </Col>

                  <Col xs={24} md={12}>
                    <div>
                      <Text
                        strong
                        style={{ display: "block", marginBottom: 8 }}
                      >
                        Tháng
                      </Text>
                      <Input
                        value={salaryData.month}
                        onChange={(e) =>
                          setSalaryData({
                            ...salaryData,
                            month: e.target.value,
                          })
                        }
                        placeholder="VD: 10"
                      />
                    </div>
                  </Col>
                </Row>

                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <div>
                      <Text
                        strong
                        style={{ display: "block", marginBottom: 8 }}
                      >
                        Ca TH
                      </Text>
                      <Input
                        value={salaryData.caTH}
                        onChange={(e) =>
                          setSalaryData({ ...salaryData, caTH: e.target.value })
                        }
                      />
                    </div>
                  </Col>

                  <Col xs={24} md={12}>
                    <div>
                      <Text
                        strong
                        style={{ display: "block", marginBottom: 8 }}
                      >
                        Lương TH (VNĐ)
                      </Text>
                      <Input
                        value={salaryData.luongTH}
                        onChange={(e) =>
                          setSalaryData({
                            ...salaryData,
                            luongTH: e.target.value,
                          })
                        }
                        onBlur={calculateSalaryTotal}
                      />
                    </div>
                  </Col>
                </Row>

                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <div>
                      <Text
                        strong
                        style={{ display: "block", marginBottom: 8 }}
                      >
                        Ca THCS
                      </Text>
                      <Input
                        value={salaryData.caTHCS}
                        onChange={(e) =>
                          setSalaryData({
                            ...salaryData,
                            caTHCS: e.target.value,
                          })
                        }
                      />
                    </div>
                  </Col>

                  <Col xs={24} md={12}>
                    <div>
                      <Text
                        strong
                        style={{ display: "block", marginBottom: 8 }}
                      >
                        Lương THCS (VNĐ)
                      </Text>
                      <Input
                        value={salaryData.luongTHCS}
                        onChange={(e) =>
                          setSalaryData({
                            ...salaryData,
                            luongTHCS: e.target.value,
                          })
                        }
                        onBlur={calculateSalaryTotal}
                      />
                    </div>
                  </Col>
                </Row>

                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <div>
                      <Text
                        strong
                        style={{ display: "block", marginBottom: 8 }}
                      >
                        Ca THPT
                      </Text>
                      <Input
                        value={salaryData.caTHPT}
                        onChange={(e) =>
                          setSalaryData({
                            ...salaryData,
                            caTHPT: e.target.value,
                          })
                        }
                      />
                    </div>
                  </Col>

                  <Col xs={24} md={12}>
                    <div>
                      <Text
                        strong
                        style={{ display: "block", marginBottom: 8 }}
                      >
                        Lương THPT (VNĐ)
                      </Text>
                      <Input
                        value={salaryData.luongTHPT}
                        onChange={(e) =>
                          setSalaryData({
                            ...salaryData,
                            luongTHPT: e.target.value,
                          })
                        }
                        onBlur={calculateSalaryTotal}
                      />
                    </div>
                  </Col>
                </Row>

                <div>
                  <Text strong style={{ display: "block", marginBottom: 8 }}>
                    Tổng lương (VNĐ)
                  </Text>
                  <Input
                    value={salaryData.tongLuong}
                    readOnly
                    style={{ fontWeight: "bold", color: "#36797f" }}
                  />
                </div>

                <div>
                  <Text strong style={{ display: "block", marginBottom: 8 }}>
                    Ghi chú
                  </Text>
                  <TextArea
                    rows={3}
                    value={salaryData.note}
                    onChange={(e) =>
                      setSalaryData({ ...salaryData, note: e.target.value })
                    }
                    placeholder="Ghi chú cho giáo viên..."
                  />
                </div>
              </div>

              {/* Preview */}
              <div>
                <Title level={4} style={{ color: "#36797f", marginBottom: 16 }}>
                  👁️ Xem trước phiếu lương
                </Title>
                <SalarySlip
                  data={salaryData}
                  onExport={() => {
                    message.success("Đã xuất ảnh thành công!");
                  }}
                />
              </div>
            </div>
          </div>
        </TabPane>
      </Tabs>
    </Card>
  );
};

export default Receipts;
