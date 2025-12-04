export type ScheduleEvent = {
    id: string;
    "Tên công việc": string;
    "Loại"?: 'LichHoc' | 'LichThi' | 'LichLamViec' | 'CV';
    "Ngày": string;
    "Giờ bắt đầu": string;
    "Giờ kết thúc": string;
    "Địa điểm"?: string;
    "Giáo viên phụ trách": string; // Teacher name for backward compatibility
    "Teacher ID"?: string; // Teacher ID to prevent duplicate creation
    "Email giáo viên"?: string; // NEW - Track teacher by email
    "Học sinh"?: string[]; // Student names for backward compatibility
    "Student IDs"?: string[]; // Student IDs to prevent duplicate creation
    "Phụ cấp di chuyển"?: string;
    "Nhận xét"?: string;
    subjectName?: string; // NEW - Subject name for the event
};

export type FilterType = 'all' | 'study' | 'work';

export type UserRole = 'admin' | 'teacher' | 'parent';

export interface UserProfile {
    uid: string;
    email: string;
    displayName?: string;
    teacherName?: string; // Optional display name used in legacy schedule/attendance matching
    role: UserRole;
    teacherId?: string; // Link to Giáo_viên record
    studentId?: string; // Link to student record (for parent role)
    studentName?: string; // Student name (for parent role)
    studentCode?: string; // Student code (for parent role)
    position?: string; // Position from Giáo_viên table (Admin, Giáo viên, etc.)
    isAdmin?: boolean; // True if position === "Admin"
    createdAt: string;
    updatedAt?: string;
}

// Class Management Types
export interface Class {
    id: string;
    "Tên lớp": string; // Class name
    "Mã lớp": string; // Class code
    "Môn học": string; // Subject
    "Khối": string; // Grade level
    "Giáo viên chủ nhiệm": string; // Homeroom teacher name
    "Teacher ID": string; // Teacher ID
    "Học sinh": string[]; // Student names
    "Student IDs": string[]; // Student IDs
    "Lịch học": ClassSchedule[]; // Weekly schedule
    "Ngày bắt đầu": string; // Start date
    "Ngày kết thúc": string; // End date
    "Lương GV"?: number; // Teacher salary (per period or agreed amount)
    "Phòng học"?: string; // Classroom
    "Ghi chú"?: string; // Notes
    "Trạng thái": "active" | "inactive"; // Status
    "Ngày tạo": string; // Created date
    "Người tạo": string; // Created by (admin email)
}

export interface ClassSchedule {
    "Thứ": number; // Day of week (2-8, where 2=Monday, 8=Sunday)
    "Giờ bắt đầu": string; // Start time (HH:mm)
    "Giờ kết thúc": string; // End time (HH:mm)
    "Địa điểm"?: string; // Location
}

// Attendance Types
export interface AttendanceSession {
    id: string;
    "Mã lớp": string; // Class code
    "Tên lớp": string; // Class name
    "Class ID": string; // Class ID
    "Ngày": string; // Date (YYYY-MM-DD)
    "Giờ bắt đầu": string; // Start time
    "Giờ kết thúc": string; // End time
    "Giáo viên": string; // Teacher name
    "Teacher ID": string; // Teacher ID
    "Trạng thái": "not_started" | "in_progress" | "completed"; // Session status
    "Điểm danh": AttendanceRecord[]; // Attendance records
    "Bài tập"?: HomeworkAssignment; // Homework assignment
    "Timestamp": string; // Created timestamp
    "Thời gian điểm danh"?: string; // Attendance taken time
    "Người điểm danh"?: string; // Person who took attendance
    "Thời gian hoàn thành"?: string; // Completion time
    "Người hoàn thành"?: string; // Person who completed
}

export interface ScoreDetail {
    "Tên điểm": string; // Score name/title
    "Điểm": number; // Score value
    "Ngày": string; // Date
    "Ghi chú"?: string; // Note
}

export interface AttendanceRecord {
    "Student ID": string;
    "Tên học sinh": string;
    "Có mặt": boolean; // Present or absent (step 1)
    "Đi muộn"?: boolean; // Late (step 2)
    "Vắng có phép"?: boolean; // Absent with permission (step 2)
    "Ghi chú"?: string;
    "Điểm"?: number | null; // Score for homework (optional)
    "Bài tập hoàn thành"?: number; // Number of exercises completed
    "% Hoàn thành BTVN"?: number; // Homework completion percentage
    "Điểm thưởng"?: number; // Bonus points
    "Bài kiểm tra"?: string; // Test name
    "Điểm kiểm tra"?: number; // Test score
    "Chi tiết điểm"?: ScoreDetail[]; // Detailed scores
}

export interface HomeworkAssignment {
    "Mô tả": string; // Description
    "Tổng số bài": number; // Total exercises
    "Người giao": string; // Assigned by
    "Thời gian giao": string; // Assignment time
}

// Course Management Types
export interface Course {
    id: string;
    "Khối": number; // Grade level
    "Môn học": string; // Subject
    "Giá": number; // Price
    "Ngày tạo": string; // Created date
    "Ngày cập nhật"?: string; // Updated date
}
