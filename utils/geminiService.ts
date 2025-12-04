import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
    console.error('⚠️ Gemini API key not found. Please set VITE_GEMINI_API_KEY in your .env.local file');
}

const genAI = new GoogleGenerativeAI(API_KEY || '');

export interface StudentReportData {
    studentName: string;
    studentCode?: string;
    totalSessions: number;
    presentSessions: number;
    absentSessions: number;
    attendanceRate: number;
    totalHours: number;
    averageScore: number;
    recentSessions: Array<{
        date: string;
        className: string;
        status: string;
        score?: number;
        homework?: string;
        note?: string;
    }>;
}

export async function generateStudentComment(reportData: StudentReportData): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000,
      },
    });

    const prompt = `
Bạn là giáo viên. Viết nhận xét ngắn (100–120 từ) bằng tiếng Việt, giọng nhẹ nhàng, tích cực.

Thông tin:
- Tên học sinh: ${reportData.studentName || 'Ẩn danh'}
- Tổng buổi: ${reportData.totalSessions}
- Có mặt: ${reportData.presentSessions}
- Vắng: ${reportData.absentSessions}
- Tỷ lệ chuyên cần: ${reportData.attendanceRate}%
- Giờ học: ${reportData.totalHours}h
- Điểm trung bình: ${reportData.averageScore}/10

Các buổi gần đây:
${reportData.recentSessions?.slice(0, 5).map((s, i) =>
  `${i + 1}. ${s.date}: ${s.status}${s.score ? `, điểm ${s.score}` : ''}`
).join('\n')}

Nội dung nhận xét gồm: thái độ, kết quả học tập, điểm mạnh, điểm cần cải thiện, lời khuyên.
Kết thúc bằng một câu động viên ngắn gọn.`;

    console.log('📤 Sending prompt to Gemini...');
    const result = await model.generateContent(prompt);
    console.log('📥 Result received:', result);
    console.log('📊 Usage metadata:', result.response?.usageMetadata);
    console.log('📥 Finish reason:', result.response?.candidates?.[0]?.finishReason);

    const text =
      result.response?.text?.() ||
      result.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      '';

    if (!text.trim()) throw new Error('API trả về nội dung rỗng');

    return text.trim();
  } catch (error: any) {
    console.error('Error generating comment with Gemini:', error);
    if (error.message.includes('quota'))
      throw new Error('API đã vượt giới hạn sử dụng, vui lòng thử lại sau.');
    if (error.message.includes('API key'))
      throw new Error('API key không hợp lệ.');
    throw new Error('Không thể tạo nhận xét. Vui lòng thử lại sau.');
  }
}
async function safeGenerateContent(model, prompt, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await model.generateContent(prompt);
    } catch (err: any) {
      if (err.message?.includes('503') && attempt < retries) {
        console.warn(`⚠️ Model overloaded, retrying (${attempt}/${retries})...`);
        await new Promise((res) => setTimeout(res, 1500 * attempt));
      } else {
        throw err;
      }
    }
  }
}


