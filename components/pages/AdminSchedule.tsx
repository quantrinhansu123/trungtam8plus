import { useState, useEffect } from "react";
import {
  Card,
  Button,
  Space,
  Tag,
  Empty,
  Select,
  Checkbox,
  Calendar as AntCalendar,
  Modal,
  Form,
  TimePicker,
  DatePicker,
  Input,
  message,
  Popover,
} from "antd";
import {
  LeftOutlined,
  RightOutlined,
  CalendarOutlined,
  BookOutlined,
  EnvironmentOutlined,
  UserOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { useClasses } from "../../hooks/useClasses";
import { Class, ClassSchedule } from "../../types";
import { useNavigate } from "react-router-dom";
import { ref, onValue, set, push, remove, update } from "firebase/database";
import { database } from "../../firebase";
import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isoWeek from "dayjs/plugin/isoWeek";
import "dayjs/locale/vi";
import WrapperContent from "@/components/WrapperContent";
import { subjectMap } from "@/utils/selectOptions";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isoWeek);
dayjs.locale("vi");

interface ScheduleEvent {
  class: Class;
  schedule: ClassSchedule;
  date: string;
  scheduleId?: string; // ID from Thời_khoá_biểu if exists
  isCustomSchedule?: boolean; // True if from Thời_khoá_biểu
}

interface TimetableEntry {
  id: string;
  "Class ID": string;
  "Mã lớp": string;
  "Tên lớp": string;
  "Ngày": string;
  "Thứ": number;
  "Giờ bắt đầu": string;
  "Giờ kết thúc": string;
  "Phòng học"?: string;
  "Ghi chú"?: string;
  "Thay thế ngày"?: string; // Ngày gốc bị thay thế (dùng khi di chuyển lịch)
  "Thay thế thứ"?: number; // Thứ gốc bị thay thế
}

type FilterMode = "class" | "subject" | "teacher" | "location";

const TIME_SLOTS = [
  { label: "Sáng", start: "06:00", end: "12:00" },
  { label: "Chiều", start: "12:00", end: "18:00" },
  { label: "Tối", start: "18:00", end: "23:59" },
];

const AdminSchedule = () => {
  const { classes, loading } = useClasses();
  const navigate = useNavigate();
  const [currentWeekStart, setCurrentWeekStart] = useState<Dayjs>(
    dayjs().startOf("isoWeek")
  );
  const [filterMode, setFilterMode] = useState<FilterMode>("teacher");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [rooms, setRooms] = useState<Map<string, any>>(new Map());
  const [attendanceSessions, setAttendanceSessions] = useState<any[]>([]);
  const [timetableEntries, setTimetableEntries] = useState<Map<string, TimetableEntry>>(new Map());
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [editForm] = Form.useForm();
  const [inlineEditing, setInlineEditing] = useState<{eventKey: string, event: ScheduleEvent} | null>(null);
  const [inlineForm] = Form.useForm();
  const [draggingEvent, setDraggingEvent] = useState<ScheduleEvent | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null); // "dayIndex_slotIndex"

  // Load rooms
  useEffect(() => {
    const roomsRef = ref(database, "datasheet/Phòng_học");
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const roomsMap = new Map();
        Object.entries(data).forEach(([id, room]: [string, any]) => {
          roomsMap.set(id, room);
        });
        setRooms(roomsMap);
      }
    });
    return () => unsubscribe();
  }, []);

  // Load attendance sessions
  useEffect(() => {
    const sessionsRef = ref(database, "datasheet/Điểm_danh_sessions");
    const unsubscribe = onValue(sessionsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const sessionsArray = Object.entries(data).map(([id, value]) => ({
          id,
          ...(value as any),
        }));
        setAttendanceSessions(sessionsArray);
      } else {
        setAttendanceSessions([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Load timetable entries from Thời_khoá_biểu
  useEffect(() => {
    const timetableRef = ref(database, "datasheet/Thời_khoá_biểu");
    const unsubscribe = onValue(timetableRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const entriesMap = new Map<string, TimetableEntry>();
        Object.entries(data).forEach(([id, value]: [string, any]) => {
          // Create a unique key: Class ID + Date + Thứ
          const key = `${value["Class ID"]}_${value["Ngày"]}_${value["Thứ"]}`;
          entriesMap.set(key, { id, ...value });
        });
        setTimetableEntries(entriesMap);
      } else {
        setTimetableEntries(new Map());
      }
    });
    return () => unsubscribe();
  }, []);

  // Helper: Check if a date is replaced by a custom schedule (moved to another day)
  const isDateReplacedByCustomSchedule = (classId: string, dateStr: string, dayOfWeek: number): boolean => {
    // Check if any timetable entry has replaced this date
    for (const [, entry] of timetableEntries) {
      if (
        entry["Class ID"] === classId &&
        entry["Thay thế ngày"] === dateStr &&
        entry["Thay thế thứ"] === dayOfWeek
      ) {
        return true; // This date has been moved to another day
      }
    }
    return false;
  };

  // Helper to get room name from ID
  const getRoomName = (roomId: string): string => {
    if (!roomId) return "";
    const room = rooms.get(roomId);
    if (room) {
      return `${room["Tên phòng"]} - ${room["Địa điểm"]}`;
    }
    return roomId; // Fallback to ID if room not found
  };

  // Helper to get attendance count for a class on a specific date
  const getAttendanceCount = (classId: string, date: string): { present: number; total: number } => {
    const session = attendanceSessions.find(
      (s) => s["Class ID"] === classId && s["Ngày"] === date
    );

    if (!session || !session["Điểm danh"]) {
      // If no session, return total students from class
      const classData = activeClasses.find((c) => c.id === classId);
      const total = classData?.["Student IDs"]?.length || 0;
      return { present: 0, total };
    }

    const attendanceRecords = Array.isArray(session["Điểm danh"])
      ? session["Điểm danh"]
      : Object.values(session["Điểm danh"] || {});

    const present = attendanceRecords.filter((r: any) => r["Có mặt"] === true).length;
    const total = attendanceRecords.length;

    return { present, total };
  };

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    currentWeekStart.add(i, "day")
  );

  const activeClasses = classes.filter((c) => c["Trạng thái"] === "active");

  // Get filter options based on mode
  const getFilterItems = () => {
    switch (filterMode) {
      case "class":
        return Array.from(
          new Set(activeClasses.map((c) => c["Khối"]))
        ).sort().map((grade) => ({
          id: grade,
          label: `Khối ${grade}`,
        }));
      case "subject":
        // Get unique subjects and filter out empty/invalid values
        const subjects = Array.from(
          new Set(
            activeClasses
              .map((c) => c["Môn học"])
              .filter((s) => s && s.trim() !== "")
          )
        ).sort();
        
        return subjects.map((subject) => ({
          id: subject,
          label: subjectMap[subject] || subject,
        }));
      case "teacher":
        return Array.from(
          new Set(
            activeClasses.map((c) =>
              JSON.stringify({
                id: c["Teacher ID"],
                name: c["Giáo viên chủ nhiệm"],
              })
            )
          )
        ).map((t) => JSON.parse(t)).map((t) => ({
          id: t.id,
          label: t.name,
        }));
      case "location":
        // Get unique rooms from "Phòng học"
        const roomIds = new Set<string>();
        activeClasses.forEach((c) => {
          if (c["Phòng học"] && c["Phòng học"].trim() !== "") {
            roomIds.add(c["Phòng học"]);
          }
        });
        return Array.from(roomIds).sort().map((roomId) => {
          const room = rooms.get(roomId);
          const label = room 
            ? `${room["Tên phòng"]} - ${room["Địa điểm"]}`
            : roomId;
          return {
            id: roomId,
            label: label,
          };
        });
      default:
        return [];
    }
  };

  const filterItems = getFilterItems();

  // Filter classes based on selected items
  const filteredClasses = activeClasses.filter((c) => {
    if (selectedItems.size === 0) return true;

    switch (filterMode) {
      case "class":
        return selectedItems.has(c["Khối"]);
      case "subject":
        return selectedItems.has(c["Môn học"]);
      case "teacher":
        return selectedItems.has(c["Teacher ID"]);
      case "location":
        // Check if class has matching room in "Phòng học"
        return c["Phòng học"] && selectedItems.has(c["Phòng học"]);
      default:
        return true;
    }
  });

  const getEventsForDateAndSlot = (
    date: Dayjs,
    slotStart: string,
    slotEnd: string
  ): ScheduleEvent[] => {
    const events: ScheduleEvent[] = [];
    const dayOfWeek = date.day() === 0 ? 8 : date.day() + 1;
    const dateStr = date.format("YYYY-MM-DD");

    filteredClasses.forEach((classData) => {
      const startDate = classData["Ngày bắt đầu"]
        ? dayjs(classData["Ngày bắt đầu"])
        : null;
      const endDate = classData["Ngày kết thúc"]
        ? dayjs(classData["Ngày kết thúc"])
        : null;

      const isWithinDateRange =
        (!startDate || date.isSameOrAfter(startDate, "day")) &&
        (!endDate || date.isSameOrBefore(endDate, "day"));

      if (!isWithinDateRange) return;

      // First, check if there's a custom schedule in Thời_khoá_biểu
      const timetableKey = `${classData.id}_${dateStr}_${dayOfWeek}`;
      const customSchedule = timetableEntries.get(timetableKey);

      if (customSchedule) {
        // Use custom schedule from Thời_khoá_biểu
        const scheduleStart = customSchedule["Giờ bắt đầu"];
        if (scheduleStart && scheduleStart >= slotStart && scheduleStart < slotEnd) {
          events.push({
            class: classData,
            schedule: {
              "Thứ": customSchedule["Thứ"],
              "Giờ bắt đầu": customSchedule["Giờ bắt đầu"],
              "Giờ kết thúc": customSchedule["Giờ kết thúc"],
            },
            date: dateStr,
            scheduleId: customSchedule.id,
            isCustomSchedule: true,
          });
        }
      } else {
        // Check if this date has been replaced by a custom schedule (moved to another day)
        if (isDateReplacedByCustomSchedule(classData.id, dateStr, dayOfWeek)) {
          return; // Skip - this date's schedule has been moved
        }

        // Fallback to class schedule
        if (!classData["Lịch học"] || classData["Lịch học"].length === 0) {
          return;
        }

        const schedules =
          classData["Lịch học"].filter((s) => {
            if (!s || s["Thứ"] !== dayOfWeek) return false;
            const scheduleStart = s["Giờ bắt đầu"];
            if (!scheduleStart) return false;
            return scheduleStart >= slotStart && scheduleStart < slotEnd;
          });

        schedules.forEach((schedule) => {
          events.push({ class: classData, schedule, date: dateStr, isCustomSchedule: false });
        });
      }
    });

    return events.sort((a, b) =>
      a.schedule["Giờ bắt đầu"].localeCompare(b.schedule["Giờ bắt đầu"])
    );
  };

  const goToPreviousWeek = () =>
    setCurrentWeekStart((prev) => prev.subtract(1, "week"));
  const goToNextWeek = () => setCurrentWeekStart((prev) => prev.add(1, "week"));
  const goToToday = () => setCurrentWeekStart(dayjs().startOf("isoWeek"));

  const isToday = (date: Dayjs) => date.isSame(dayjs(), "day");

  const handleItemToggle = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filterItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filterItems.map((item) => item.id)));
    }
  };

  const handleEditSchedule = (event: ScheduleEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEvent(event);
    editForm.setFieldsValue({
      "Giờ bắt đầu": event.schedule["Giờ bắt đầu"] ? dayjs(event.schedule["Giờ bắt đầu"], "HH:mm") : null,
      "Giờ kết thúc": event.schedule["Giờ kết thúc"] ? dayjs(event.schedule["Giờ kết thúc"], "HH:mm") : null,
      "Phòng học": event.class["Phòng học"] || "",
      "Ghi chú": "",
    });
    setIsEditModalOpen(true);
  };

  const handleSaveSchedule = async () => {
    if (!editingEvent) return;

    try {
      const values = await editForm.validateFields();
      const dateStr = editingEvent.date;
      const dayOfWeek = dayjs(dateStr).day() === 0 ? 8 : dayjs(dateStr).day() + 1;

      const timetableData: Omit<TimetableEntry, "id"> = {
        "Class ID": editingEvent.class.id,
        "Mã lớp": editingEvent.class["Mã lớp"] || "",
        "Tên lớp": editingEvent.class["Tên lớp"] || "",
        "Ngày": dateStr,
        "Thứ": dayOfWeek,
        "Giờ bắt đầu": values["Giờ bắt đầu"].format("HH:mm"),
        "Giờ kết thúc": values["Giờ kết thúc"].format("HH:mm"),
        "Phòng học": values["Phòng học"] || "",
        "Ghi chú": values["Ghi chú"] || "",
      };

      // Nếu đang sửa lịch bù hiện có (có scheduleId), update trực tiếp entry đó
      if (editingEvent.scheduleId) {
        const entryRef = ref(database, `datasheet/Thời_khoá_biểu/${editingEvent.scheduleId}`);
        await set(entryRef, timetableData);
        message.success("Đã cập nhật lịch học bù");
      } else {
        // Tạo lịch bù mới
        const timetableRef = ref(database, "datasheet/Thời_khoá_biểu");
        const newEntryRef = push(timetableRef);
        await set(newEntryRef, timetableData);
        message.success("Đã tạo lịch học bù mới");
      }

      setIsEditModalOpen(false);
      setEditingEvent(null);
      editForm.resetFields();
    } catch (error) {
      console.error("Error saving schedule:", error);
      message.error("Có lỗi xảy ra khi lưu lịch học");
    }
  };

  const handleDeleteSchedule = async () => {
    if (!editingEvent || !editingEvent.scheduleId) return;

    try {
      const entryRef = ref(database, `datasheet/Thời_khoá_biểu/${editingEvent.scheduleId}`);
      await remove(entryRef);
      message.success("Đã xóa lịch học khỏi thời khóa biểu");
      setIsEditModalOpen(false);
      setEditingEvent(null);
      editForm.resetFields();
    } catch (error) {
      console.error("Error deleting schedule:", error);
      message.error("Có lỗi xảy ra khi xóa lịch học");
    }
  };

  const handleInlineEdit = (event: ScheduleEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    const eventKey = `${event.class.id}_${event.date}_${event.schedule["Thứ"]}`;
    setInlineEditing({ eventKey, event });
    inlineForm.setFieldsValue({
      "Ngày": dayjs(event.date),
      "Giờ bắt đầu": event.schedule["Giờ bắt đầu"] ? dayjs(event.schedule["Giờ bắt đầu"], "HH:mm") : null,
      "Giờ kết thúc": event.schedule["Giờ kết thúc"] ? dayjs(event.schedule["Giờ kết thúc"], "HH:mm") : null,
    });
  };

  const handleInlineSave = async () => {
    if (!inlineEditing) return;

    try {
      const values = await inlineForm.validateFields();
      const newDate = values["Ngày"].format("YYYY-MM-DD");
      const dayOfWeek = values["Ngày"].day() === 0 ? 8 : values["Ngày"].day() + 1;
      const oldDate = inlineEditing.event.date;
      const oldDayOfWeek = inlineEditing.event.schedule["Thứ"];

      // Chuẩn bị dữ liệu cập nhật
      const timetableData: Omit<TimetableEntry, "id"> = {
        "Class ID": inlineEditing.event.class.id,
        "Mã lớp": inlineEditing.event.class["Mã lớp"] || "",
        "Tên lớp": inlineEditing.event.class["Tên lớp"] || "",
        "Ngày": newDate,
        "Thứ": dayOfWeek,
        "Giờ bắt đầu": values["Giờ bắt đầu"].format("HH:mm"),
        "Giờ kết thúc": values["Giờ kết thúc"].format("HH:mm"),
        "Phòng học": inlineEditing.event.class["Phòng học"] || "",
      };

      // Nếu đổi ngày và đây là lịch mặc định (không phải lịch bù), 
      // thêm thông tin ngày gốc bị thay thế
      if (newDate !== oldDate && !inlineEditing.event.isCustomSchedule) {
        (timetableData as any)["Thay thế ngày"] = oldDate;
        (timetableData as any)["Thay thế thứ"] = oldDayOfWeek;
      }

      // Nếu có scheduleId (lịch học bù đang sửa) và ngày không đổi -> cập nhật tại chỗ
      if (inlineEditing.event.scheduleId && newDate === oldDate) {
        const existingRef = ref(database, `datasheet/Thời_khoá_biểu/${inlineEditing.event.scheduleId}`);
        await update(existingRef, timetableData);
        message.success("Đã cập nhật lịch học bù");
      } else if (inlineEditing.event.scheduleId) {
        // Có scheduleId nhưng ngày đổi -> xóa entry cũ và tạo mới (giữ lại thông tin thay thế nếu có)
        const oldEntryRef = ref(database, `datasheet/Thời_khoá_biểu/${inlineEditing.event.scheduleId}`);
        
        // Lấy thông tin thay thế cũ nếu có
        const oldEntry = timetableEntries.get(`${inlineEditing.event.class.id}_${oldDate}_${oldDayOfWeek}`);
        if (oldEntry && oldEntry["Thay thế ngày"]) {
          (timetableData as any)["Thay thế ngày"] = oldEntry["Thay thế ngày"];
          (timetableData as any)["Thay thế thứ"] = oldEntry["Thay thế thứ"];
        }
        
        await remove(oldEntryRef);
        
        const timetableRef = ref(database, "datasheet/Thời_khoá_biểu");
        const newEntryRef = push(timetableRef);
        await set(newEntryRef, timetableData);
        message.success("Đã cập nhật lịch học bù (đổi ngày)");
      } else {
        // Không có scheduleId -> tạo mới
        const timetableRef = ref(database, "datasheet/Thời_khoá_biểu");
        const newEntryRef = push(timetableRef);
        await set(newEntryRef, timetableData);
        message.success("Đã tạo lịch học bù mới");
      }

      setInlineEditing(null);
      inlineForm.resetFields();
    } catch (error) {
      console.error("Error saving inline schedule:", error);
      message.error("Có lỗi xảy ra khi lưu lịch học");
    }
  };

  const handleInlineCancel = () => {
    setInlineEditing(null);
    inlineForm.resetFields();
  };

  // ===== DRAG & DROP HANDLERS =====
  const handleDragStart = (e: React.DragEvent, event: ScheduleEvent) => {
    setDraggingEvent(event);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify({
      classId: event.class.id,
      date: event.date,
      scheduleId: event.scheduleId,
      isCustomSchedule: event.isCustomSchedule,
      schedule: event.schedule,
    }));
    // Make the drag image slightly transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggingEvent(null);
    setDragOverCell(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  };

  const handleDragOver = (e: React.DragEvent, cellKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCell(cellKey);
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Dayjs) => {
    e.preventDefault();
    setDragOverCell(null);

    if (!draggingEvent) return;

    const newDateStr = targetDate.format("YYYY-MM-DD");
    const oldDateStr = draggingEvent.date;

    // Nếu drop vào cùng ngày thì không làm gì
    if (newDateStr === oldDateStr) {
      setDraggingEvent(null);
      return;
    }

    const newDayOfWeek = targetDate.day() === 0 ? 8 : targetDate.day() + 1;
    const oldDayOfWeek = draggingEvent.schedule["Thứ"];

    try {
      // Chuẩn bị dữ liệu - giữ nguyên giờ, chỉ đổi ngày
      const timetableData: Omit<TimetableEntry, "id"> = {
        "Class ID": draggingEvent.class.id,
        "Mã lớp": draggingEvent.class["Mã lớp"] || "",
        "Tên lớp": draggingEvent.class["Tên lớp"] || "",
        "Ngày": newDateStr,
        "Thứ": newDayOfWeek,
        "Giờ bắt đầu": draggingEvent.schedule["Giờ bắt đầu"],
        "Giờ kết thúc": draggingEvent.schedule["Giờ kết thúc"],
        "Phòng học": draggingEvent.class["Phòng học"] || "",
      };

      // Nếu đây là lịch mặc định (không phải lịch bù), thêm thông tin ngày gốc bị thay thế
      if (!draggingEvent.isCustomSchedule) {
        (timetableData as any)["Thay thế ngày"] = oldDateStr;
        (timetableData as any)["Thay thế thứ"] = oldDayOfWeek;
      }

      if (draggingEvent.scheduleId) {
        // Đang kéo lịch bù - cập nhật hoặc tạo mới tùy vào có thay đổi ngày
        // Lấy thông tin thay thế cũ nếu có
        const existingEntry = Array.from(timetableEntries.values()).find(
          entry => entry.id === draggingEvent.scheduleId
        );
        if (existingEntry && existingEntry["Thay thế ngày"]) {
          (timetableData as any)["Thay thế ngày"] = existingEntry["Thay thế ngày"];
          (timetableData as any)["Thay thế thứ"] = existingEntry["Thay thế thứ"];
        }

        // Xóa entry cũ và tạo mới (vì key trong map thay đổi khi đổi ngày)
        const oldEntryRef = ref(database, `datasheet/Thời_khoá_biểu/${draggingEvent.scheduleId}`);
        await remove(oldEntryRef);

        const timetableRef = ref(database, "datasheet/Thời_khoá_biểu");
        const newEntryRef = push(timetableRef);
        await set(newEntryRef, timetableData);
      } else {
        // Đang kéo lịch mặc định - tạo lịch bù mới
        const timetableRef = ref(database, "datasheet/Thời_khoá_biểu");
        const newEntryRef = push(timetableRef);
        await set(newEntryRef, timetableData);
      }

      message.success(`Đã di chuyển lịch từ ${oldDateStr} sang ${newDateStr}`);
    } catch (error) {
      console.error("Error moving schedule:", error);
      message.error("Có lỗi xảy ra khi di chuyển lịch học");
    }

    setDraggingEvent(null);
  };

  if (activeClasses.length === 0 && !loading)
    return (
      <div style={{ padding: "24px" }}>
        <Empty description="Chưa có lớp học nào" />
      </div>
    );

  return (
    <WrapperContent title="Lịch dạy tổng hợp" isLoading={loading}>
      <div style={{ display: "flex", gap: "16px", height: "calc(100vh - 200px)" }}>
        {/* Sidebar */}
        <div
          style={{
            width: "280px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            maxHeight: "100%",
            overflowY: "auto",
          }}
        >
          {/* Mini Calendar */}
          <Card size="small" style={{ padding: "8px" }}>
            <AntCalendar
              fullscreen={false}
              value={currentWeekStart}
              onChange={(date) => setCurrentWeekStart(date.startOf("isoWeek"))}
            />
          </Card>

          {/* Filter Mode Dropdown */}
          <Card size="small" title="Bộ lọc lịch" key={`filter-card-${filterMode}`}>
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "12px", color: "#666", marginBottom: "6px" }}>
                Chế độ lọc:
              </div>
              <Select
                style={{ width: "100%" }}
                value={filterMode}
                onChange={(value) => {
                  setFilterMode(value);
                  setSelectedItems(new Set());
                }}
                options={[
                  { value: "teacher", label: "🧑‍🏫 Theo Giáo viên" },
                  { value: "class", label: "📚 Theo Khối" },
                  { value: "subject", label: "📖 Theo Môn học" },
                  { value: "location", label: "📍 Theo phòng học" },
                ]}
              />
            </div>

            {filterItems.length > 0 && (
              <>
                {/* Select All Checkbox */}
                <div style={{ marginBottom: "8px", paddingBottom: "8px", borderBottom: "1px solid #f0f0f0" }}>
                  <Checkbox
                    checked={selectedItems.size === filterItems.length}
                    indeterminate={selectedItems.size > 0 && selectedItems.size < filterItems.length}
                    onChange={handleSelectAll}
                  >
                    <strong>
                      {selectedItems.size === 0
                        ? "Chọn tất cả"
                        : `Đã chọn ${selectedItems.size}/${filterItems.length}`}
                    </strong>
                  </Checkbox>
                </div>

                {/* Filter Items */}
                <div 
                  key={filterMode} 
                  style={{ maxHeight: "300px", overflowY: "auto", overflowX: "hidden" }}
                >
                  <Space direction="vertical" style={{ width: "100%" }} size="small">
                    {filterItems.map((item) => (
                      <Checkbox
                        key={`${filterMode}-${item.id}`}
                        checked={selectedItems.has(item.id)}
                        onChange={() => handleItemToggle(item.id)}
                        style={{ width: "100%", margin: 0 }}
                      >
                        <span 
                          style={{ 
                            fontSize: "13px",
                            wordBreak: "break-word",
                            whiteSpace: "normal",
                            lineHeight: "1.4"
                          }}
                        >
                          {item.label}
                        </span>
                      </Checkbox>
                    ))}
                  </Space>
                </div>
              </>
            )}

            {filterItems.length === 0 && (
              <Empty
                description="Không có dữ liệu"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ margin: "20px 0" }}
              />
            )}
          </Card>
        </div>

        {/* Main Calendar View */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Week Navigation */}
          <Card style={{ marginBottom: "16px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Button icon={<LeftOutlined />} onClick={goToPreviousWeek}>
                Tuần trước
              </Button>
              <Space>
                <CalendarOutlined />
                <span style={{ fontSize: 16, fontWeight: "bold" }}>
                  Tuần {currentWeekStart.isoWeek()} -{" "}
                  {currentWeekStart.format("MMMM YYYY")}
                </span>
                <span style={{ color: "#999" }}>
                  ({currentWeekStart.format("DD/MM")} -{" "}
                  {currentWeekStart.add(6, "day").format("DD/MM")})
                </span>
              </Space>
              <Space>
                <Button onClick={goToToday}>Hôm nay</Button>
                <Button icon={<RightOutlined />} onClick={goToNextWeek}>
                  Tuần sau
                </Button>
              </Space>
            </div>
          </Card>

          {/* Schedule Table */}
          <div style={{ flex: 1, overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                backgroundColor: "white",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      border: "1px solid #f0f0f0",
                      padding: "12px",
                      backgroundColor: "#fafafa",
                      width: "100px",
                      textAlign: "center",
                    }}
                  ></th>
                  {weekDays.map((day, index) => (
                    <th
                      key={index}
                      style={{
                        border: "1px solid #f0f0f0",
                        padding: "12px",
                        backgroundColor: isToday(day) ? "#e6f7ff" : "#fafafa",
                        textAlign: "center",
                        minWidth: "150px",
                      }}
                    >
                      <div className="capitalize" style={{ fontWeight: "bold" }}>
                        {day.format("dddd")}
                      </div>
                      <div style={{ fontSize: "12px", color: "#666" }}>
                        {day.format("DD/MM/YYYY")}
                      </div>
                      {isToday(day) && (
                        <Tag color="blue" style={{ fontSize: "11px", marginTop: "4px" }}>
                          Hôm nay
                        </Tag>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((slot, slotIndex) => (
                  <tr key={slotIndex}>
                    <td
                      style={{
                        border: "1px solid #f0f0f0",
                        padding: "12px",
                        backgroundColor: "#fafafa",
                        fontWeight: "bold",
                        textAlign: "center",
                        verticalAlign: "top",
                      }}
                    >
                      {slot.label}
                    </td>
                    {weekDays.map((day, dayIndex) => {
                      const events = getEventsForDateAndSlot(
                        day,
                        slot.start,
                        slot.end
                      );
                      const cellKey = `${dayIndex}_${slotIndex}`;
                      const isDragOver = dragOverCell === cellKey;
                      
                      return (
                        <td
                          key={dayIndex}
                          style={{
                            border: "1px solid #f0f0f0",
                            padding: "8px",
                            backgroundColor: isDragOver 
                              ? "#bae7ff" 
                              : isToday(day) ? "#f6ffed" : "white",
                            verticalAlign: "top",
                            minHeight: "120px",
                            transition: "background-color 0.2s",
                            outline: isDragOver ? "2px dashed #1890ff" : "none",
                          }}
                          onDragOver={(e) => handleDragOver(e, cellKey)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, day)}
                        >
                          {events.length === 0 ? (
                            <div
                              style={{
                                textAlign: "center",
                                color: isDragOver ? "#1890ff" : "#ccc",
                                padding: "20px 0",
                                fontWeight: isDragOver ? "bold" : "normal",
                              }}
                            >
                              {isDragOver ? "Thả vào đây" : "-"}
                            </div>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                              }}
                            >
                              {events.map((event, idx) => {
                                const eventKey = `${event.class.id}_${event.date}_${event.schedule["Thứ"]}`;
                                const isEditing = inlineEditing?.eventKey === eventKey;
                                const isDragging = draggingEvent?.class.id === event.class.id && 
                                                   draggingEvent?.date === event.date;
                                
                                return (
                                <div
                                  key={idx}
                                  draggable={!isEditing}
                                  onDragStart={(e) => handleDragStart(e, event)}
                                  onDragEnd={handleDragEnd}
                                  style={{
                                    padding: "8px",
                                    backgroundColor: event.isCustomSchedule ? "#e6f7ff" : "#fff7e6",
                                    borderLeft: `3px solid ${event.isCustomSchedule ? "#1890ff" : "#fa8c16"}`,
                                    borderRadius: "4px",
                                    cursor: isEditing ? "default" : "grab",
                                    transition: "all 0.3s",
                                    position: "relative",
                                    opacity: isDragging ? 0.5 : 1,
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isEditing) {
                                      e.currentTarget.style.backgroundColor =
                                        event.isCustomSchedule ? "#bae7ff" : "#ffd591";
                                      e.currentTarget.style.transform =
                                        "translateX(2px)";
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isEditing) {
                                      e.currentTarget.style.backgroundColor =
                                        event.isCustomSchedule ? "#e6f7ff" : "#fff7e6";
                                      e.currentTarget.style.transform =
                                        "translateX(0)";
                                    }
                                  }}
                                >
                                  {!isEditing ? (
                                    <>
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                                        <div
                                          style={{
                                            fontWeight: "bold",
                                            fontSize: "13px",
                                            flex: 1,
                                          }}
                                          onClick={() =>
                                            navigate(
                                              `/workspace/classes/${event.class.id}/history`
                                            )
                                          }
                                        >
                                          <BookOutlined /> {event.class["Tên lớp"]}
                                        </div>
                                        <Space size={4}>
                                          <Button
                                            type="text"
                                            size="small"
                                            icon={<EditOutlined />}
                                            onClick={(e) => handleInlineEdit(event, e)}
                                            title="Sửa trực tiếp"
                                            style={{
                                              padding: "0 4px",
                                              height: "20px",
                                              fontSize: "10px",
                                            }}
                                          />
                                          <Button
                                            type="text"
                                            size="small"
                                            onClick={(e) => handleEditSchedule(event, e)}
                                            title="Sửa chi tiết (Modal)"
                                            style={{
                                              padding: "0 4px",
                                              height: "20px",
                                              fontSize: "10px",
                                            }}
                                          >
                                            ...
                                          </Button>
                                        </Space>
                                      </div>
                                      <div
                                        onClick={() =>
                                          navigate(
                                            `/workspace/classes/${event.class.id}/history`
                                          )
                                        }
                                      >
                                        <div
                                          style={{
                                            fontSize: "12px",
                                            color: "#666",
                                            marginBottom: "4px",
                                            cursor: "pointer",
                                            padding: "4px",
                                            borderRadius: "4px",
                                            backgroundColor: "rgba(0,0,0,0.02)",
                                          }}
                                          onClick={(e) => handleInlineEdit(event, e)}
                                          title="Click để chỉnh sửa"
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = "rgba(24, 144, 255, 0.1)";
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.02)";
                                          }}
                                        >
                                          🕐 {event.schedule["Giờ bắt đầu"]} -{" "}
                                          {event.schedule["Giờ kết thúc"]}
                                        </div>
                                        <div
                                          style={{
                                            fontSize: "11px",
                                            color: "#999",
                                            marginBottom: "4px",
                                            cursor: "pointer",
                                            padding: "4px",
                                            borderRadius: "4px",
                                            backgroundColor: "rgba(0,0,0,0.02)",
                                          }}
                                          onClick={(e) => handleInlineEdit(event, e)}
                                          title="Click để chỉnh sửa"
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = "rgba(24, 144, 255, 0.1)";
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.02)";
                                          }}
                                        >
                                          📅 {dayjs(event.date).format("DD/MM/YYYY")}
                                        </div>
                                        <div
                                          style={{
                                            fontSize: "11px",
                                            color: "#999",
                                            marginBottom: "4px",
                                          }}
                                        >
                                          <UserOutlined />{" "}
                                          {event.class["Giáo viên chủ nhiệm"]}
                                        </div>
                                        {(event.class["Phòng học"] || event.schedule["Địa điểm"]) && (
                                          <div
                                            style={{ fontSize: "11px", color: "#999", marginBottom: "4px" }}
                                          >
                                            <EnvironmentOutlined />{" "}
                                            {getRoomName(event.class["Phòng học"]) || event.schedule["Địa điểm"]}
                                          </div>
                                        )}
                                        <div style={{ marginTop: "4px", display: "flex", gap: "4px", alignItems: "center" }}>
                                          <Tag
                                            color="orange"
                                            style={{ fontSize: "10px", margin: 0 }}
                                          >
                                            {subjectMap[event.class["Môn học"]] ||
                                              event.class["Môn học"]}
                                          </Tag>
                                          {(() => {
                                            const attendance = getAttendanceCount(event.class.id, event.date);
                                            if (attendance.total > 0) {
                                              return (
                                                <span
                                                  style={{
                                                    fontSize: "11px",
                                                    fontWeight: "bold",
                                                    color: "#52c41a",
                                                    backgroundColor: "#ff4d4f",
                                                    padding: "2px 6px",
                                                    borderRadius: "4px",
                                                    marginLeft: "4px",
                                                  }}
                                                >
                                                  {attendance.present}/{attendance.total}
                                                </span>
                                              );
                                            }
                                            return null;
                                          })()}
                                        </div>
                                        {event.isCustomSchedule && (
                                          <Tag color="blue" style={{ fontSize: "9px", marginTop: "4px" }}>
                                            Đã chỉnh sửa
                                          </Tag>
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    <div style={{ padding: "4px", backgroundColor: "#f0f9ff", borderRadius: "4px", border: "1px solid #91d5ff" }}>
                                      <div style={{ fontSize: "11px", fontWeight: "bold", marginBottom: "8px", color: "#1890ff" }}>
                                        ✏️ Chỉnh sửa lịch học
                                      </div>
                                      <Form form={inlineForm} layout="vertical" size="small">
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                                          <Form.Item
                                            label="Ngày"
                                            name="Ngày"
                                            rules={[{ required: true, message: "Chọn ngày" }]}
                                            style={{ marginBottom: 0 }}
                                          >
                                            <DatePicker
                                              format="DD/MM/YYYY"
                                              style={{ width: "100%" }}
                                              size="small"
                                            />
                                          </Form.Item>
                                          <div style={{ display: "flex", gap: "4px" }}>
                                            <Form.Item
                                              label="Bắt đầu"
                                              name="Giờ bắt đầu"
                                              rules={[{ required: true, message: "Chọn giờ" }]}
                                              style={{ marginBottom: 0, flex: 1 }}
                                            >
                                              <TimePicker
                                                format="HH:mm"
                                                style={{ width: "100%" }}
                                                size="small"
                                              />
                                            </Form.Item>
                                            <Form.Item
                                              label="Kết thúc"
                                              name="Giờ kết thúc"
                                              rules={[{ required: true, message: "Chọn giờ" }]}
                                              style={{ marginBottom: 0, flex: 1 }}
                                            >
                                              <TimePicker
                                                format="HH:mm"
                                                style={{ width: "100%" }}
                                                size="small"
                                              />
                                            </Form.Item>
                                          </div>
                                        </div>
                                        <Space size="small" style={{ width: "100%", justifyContent: "flex-end", marginTop: "4px" }}>
                                          <Button size="small" onClick={handleInlineCancel}>
                                            Hủy
                                          </Button>
                                          <Button size="small" type="primary" onClick={handleInlineSave}>
                                            Lưu
                                          </Button>
                                        </Space>
                                      </Form>
                                    </div>
                                  )}
                                </div>
                              );
                              })}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Schedule Modal */}
      <Modal
        title="Chỉnh sửa lịch học trong thời khóa biểu"
        open={isEditModalOpen}
        onOk={handleSaveSchedule}
        onCancel={() => {
          setIsEditModalOpen(false);
          setEditingEvent(null);
          editForm.resetFields();
        }}
        okText="Lưu"
        cancelText="Hủy"
        width={600}
        footer={[
          editingEvent?.scheduleId && (
            <Button key="delete" danger onClick={handleDeleteSchedule}>
              Xóa khỏi thời khóa biểu
            </Button>
          ),
          <Button key="cancel" onClick={() => {
            setIsEditModalOpen(false);
            setEditingEvent(null);
            editForm.resetFields();
          }}>
            Hủy
          </Button>,
          <Button key="save" type="primary" onClick={handleSaveSchedule}>
            Lưu
          </Button>,
        ].filter(Boolean)}
      >
        {editingEvent && (
          <div style={{ marginBottom: "16px", padding: "12px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
            <div><strong>Lớp:</strong> {editingEvent.class["Tên lớp"]}</div>
            <div><strong>Ngày:</strong> {dayjs(editingEvent.date).format("dddd, DD/MM/YYYY")}</div>
            <div style={{ marginTop: "8px", fontSize: "12px", color: "#666" }}>
              <em>Lưu ý: Thay đổi này chỉ ảnh hưởng đến thời khóa biểu, không thay đổi lịch học trong Lớp học.</em>
            </div>
          </div>
        )}
        <Form form={editForm} layout="vertical">
          <Form.Item
            label="Giờ bắt đầu"
            name="Giờ bắt đầu"
            rules={[{ required: true, message: "Chọn giờ bắt đầu" }]}
          >
            <TimePicker format="HH:mm" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            label="Giờ kết thúc"
            name="Giờ kết thúc"
            rules={[{ required: true, message: "Chọn giờ kết thúc" }]}
          >
            <TimePicker format="HH:mm" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Phòng học" name="Phòng học">
            <Input placeholder="Nhập phòng học (tùy chọn)" />
          </Form.Item>
          <Form.Item label="Ghi chú" name="Ghi chú">
            <Input.TextArea rows={3} placeholder="Nhập ghi chú (tùy chọn)" />
          </Form.Item>
        </Form>
      </Modal>
    </WrapperContent>
  );
};

export default AdminSchedule;
