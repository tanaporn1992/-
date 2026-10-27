import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Allow body parsing for image uploads (base64)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Gemini instance
let ai: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
} catch (err) {
  console.warn('GoogleGenAI initialization notice:', err);
}

// 1. Endpoint: AI OCR for reading meter digits from uploaded photo
app.post('/api/read-meter', async (req, res) => {
  try {
    const { imageBase64, meterType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY not configured',
        message: 'กรุณาตั้งค่า GEMINI_API_KEY หรือกรอกตัวเลขด้วยตนเอง'
      });
    }

    if (!ai) {
      ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }

    // Clean base64 data
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const prompt = `You are an expert utility meter reader for dormitory utility auditing.
Look at this utility meter photo (${meterType || 'water or electricity meter'}).
Carefully detect the numeric digits on the primary counter/display dials or screen.
Rules:
- For water meters: usually 4-7 digits. Read the main black integer digits (ignore red decimal digits or small sub-dials if any).
- For electricity meters: usually 4-6 digits on the mechanical dial counter or digital LCD. Read the main integer kWh reading.
- Identify whether this is water or electricity if possible.
- Provide a confidence score between 0.0 and 1.0.
Respond strictly in JSON format matching this schema:
{
  "reading": number,
  "detectedMeterType": "water" | "electricity",
  "confidence": number,
  "confidencePercent": string,
  "explanation": string
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: cleanBase64,
              },
            },
          ],
        },
      ],
    });

    const text = response.text || '';
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return res.json({ success: true, ...parsed });
    }

    res.json({
      success: true,
      reading: 0,
      detectedMeterType: meterType || 'unknown',
      confidence: 0.5,
      explanation: text,
    });
  } catch (error: any) {
    console.error('API /api/read-meter error:', error);
    res.status(500).json({
      error: error.message || 'Error processing meter image',
      fallback: true,
    });
  }
});

// 2. Endpoint: AI Automated Expense & Anomaly Analysis
app.post('/api/analyze-expenses', async (req, res) => {
  try {
    const data = req.body;
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY not configured',
      });
    }

    if (!ai) {
      ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }

    const prompt = `คุณคือผู้เชี่ยวชาญการจัดการพลังงานและระบบบัญชีค่าสาธารณูปโภคของหอพักมหาวิทยาลัย/อาคารพักอาศัย
โปรดวิเคราะห์ข้อมูลการใช้น้ำ-ไฟฟ้า และค่าใช้จ่ายประจำเดือนต่อไปนี้อย่างมืออาชีพ:
ข้อมูลประจำเดือน: ${JSON.stringify(data)}

โปรดสรุปเป็นภาษาไทยที่กระชับ ชัดเจน เข้าใจง่าย มีโครงสร้างดังนี้:
1. สรุปภาพรวมรายได้และการใช้งาน (Executive Summary): สรุปยอดรวมค่าน้ำ ค่าไฟ และจำนวนหน่วยที่ใช้
2. จุดสังเกตและความผิดปกติ (Anomalies & Leaks): อาคารหรือห้องที่มีหน่วยใช้สูงผิดปกติ หรือห้องที่มีการแจ้งสถานะ (เช่น ปรับปรุง, นักศึกษาต่างชาติ, นักฟุตบอล, ห้องว่าง)
3. ข้อเสนอแนะเชิงรุกในการประหยัดต้นทุนและพลังงาน (Cost Optimization): คำแนะนำสำหรับผู้ดูแลหอพัก`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    res.json({
      success: true,
      analysis: response.text,
    });
  } catch (error: any) {
    console.error('API /api/analyze-expenses error:', error);
    res.status(500).json({ error: error.message || 'Error generating analysis' });
  }
});

// Vite middleware in dev or static files in production
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
