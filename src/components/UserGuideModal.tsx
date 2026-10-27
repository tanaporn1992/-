import React from 'react';
import {
  X,
  BookOpen,
  Smartphone,
  Camera,
  RotateCcw,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  Zap,
  Droplets,
  HardDrive,
  Sparkles,
} from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToTab?: (tab: any) => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({
  isOpen,
  onClose,
  onGoToTab,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 no-print">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-400 text-slate-950 rounded-xl font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">คู่มือการใช้งานระบบจดมิเตอร์หอพัก</h3>
              <p className="text-xs text-slate-400">
                ขั้นตอนการปฏิบัติงานจริงสำหรับผู้จัดการหอพักและเจ้าหน้าที่จดมิเตอร์
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 leading-relaxed">
          {/* Quick Overview */}
          <div className="bg-sky-50 border border-sky-100 p-4 rounded-xl space-y-2">
            <span className="font-bold text-sky-900 text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-sky-600" />
              <span>ภาพรวมการทำงานในแต่ละรอบเดือน (4 ขั้นตอนง่ายๆ)</span>
            </span>
            <p className="text-slate-600">
              ระบบนี้ออกแบบมาเพื่อทดแทนการจดใส่สมุดกระดาษ ช่วยคำนวณค่าน้ำ-ค่าไฟอัตโนมัติ 
              พร้อมถ่ายรูปเก็บหลักฐานป้องกันข้อพิพาท และพิมพ์ใบแจ้งหนี้รูปแบบราชการได้ทันที
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex gap-4 p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors bg-white">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 font-black flex items-center justify-center shrink-0 text-sm">
                1
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">
                    ตรวจสอบหรือยกยอด "เลขตั้งต้น" (ต้นงวด)
                  </h4>
                  <button
                    onClick={() => {
                      onClose();
                      onGoToTab?.('baseline');
                    }}
                    className="text-amber-700 hover:underline font-bold text-[11px]"
                  >
                    ไปที่แท็บเลขตั้งต้น ➔
                  </button>
                </div>
                <p className="text-slate-600">
                  ไปที่แท็บ <b>"เลขตั้งต้น"</b> เพื่อตรวจดูเลขมิเตอร์ยกมาจากรอบที่แล้ว (เช่น ส.ค. 69) 
                  หากขึ้นรอบเดือนใหม่ สามารถกดปุ่ม <b>"ยกยอดจากเดือนก่อน"</b> เพื่อดึงเลขจดล่าสุดของเดือนที่แล้วมาเป็นเลขตั้งต้นรอบนี้ได้ในคลิกเดียว
                </p>
                <div className="text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-200 text-slate-600">
                  💡 <b>กรณีเปลี่ยนมิเตอร์ใหม่:</b> หากห้องไหนเปลี่ยนลูกมิเตอร์ สามารถมาแก้เลขตั้งต้นเป็น 0 ที่แท็บนี้ได้โดยตรง
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4 p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors bg-white">
              <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-900 font-black flex items-center justify-center shrink-0 text-sm">
                2
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">
                    เดินจดมิเตอร์หน้าห้อง (ด้วยมือถือหรือแท็บเล็ต)
                  </h4>
                  <button
                    onClick={() => {
                      onClose();
                      onGoToTab?.('walkthrough');
                    }}
                    className="text-sky-700 hover:underline font-bold text-[11px]"
                  >
                    ไปที่จดมิเตอร์ด่วน ➔
                  </button>
                </div>
                <p className="text-slate-600">
                  ใช้สมาร์ตโฟนเปิดเว็บแอปนี้แล้วเลือกเมนู <b>"จดมิเตอร์ด่วน" (Quick Walkthrough)</b> หรือ <b>"รายงานรูปภาพ"</b>:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                  <li>กดปุ่ม <b>"ถ่ายรูป"</b> เพื่อถ่ายภาพมิเตอร์น้ำ/ไฟ หรือใช้ <b>"AI สแกน"</b> ให้อ่านตัวเลขอัตโนมัติ</li>
                  <li>พิมพ์เลขจดใหม่ ระบบจะคำนวณหน่วยที่ใช้และยอดเงินให้ทันที</li>
                  <li>กด <b>"บันทึก & ห้องถัดไป"</b> ระบบจะเลื่อนไปห้องถัดไปตามลำดับชั้นอย่างต่อเนื่อง</li>
                </ul>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4 p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors bg-white">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-900 font-black flex items-center justify-center shrink-0 text-sm">
                3
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">
                    ตรวจสอบตารางสรุปราชการ & พิมพ์รายงานสรุป (A4)
                  </h4>
                  <button
                    onClick={() => {
                      onClose();
                      onGoToTab?.('buildingSheet');
                    }}
                    className="text-indigo-700 hover:underline font-bold text-[11px]"
                  >
                    ไปที่ตารางจดรายอาคาร ➔
                  </button>
                </div>
                <p className="text-slate-600">
                  ไปที่แท็บ <b>"ตารางจดรายอาคาร"</b> จะได้ตารางบัญชีสรุปค่าน้ำ-ค่าไฟตรงตามแบบฟอร์ม PDF ทางการของหอพัก 
                  สามารถกดปุ่ม <b>"พิมพ์รายงานตาราง (PDF/A4)"</b> เพื่อพิมพ์เอกสารส่งฝ่ายการเงินหรือติดประกาศได้ทันที
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4 p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors bg-white">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-900 font-black flex items-center justify-center shrink-0 text-sm">
                4
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">
                    พิมพ์ประกาศติดบอร์ด (ทั้งอาคาร A4) & สลิปรายห้อง (PDF)
                  </h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onClose();
                        onGoToTab?.('invoices');
                      }}
                      className="text-emerald-700 hover:underline font-bold text-[11px]"
                    >
                      ศูนย์พิมพ์ & PDF ➔
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        onGoToTab?.('export');
                      }}
                      className="text-emerald-700 hover:underline font-bold text-[11px]"
                    >
                      ส่งออก Sheets ➔
                    </button>
                  </div>
                </div>
                <p className="text-slate-600">
                  - <b>พิมพ์ประกาศติดบอร์ด (ทั้งอาคาร A4):</b> เลือกอาคารที่ต้องการ ระบบจะจัดทำแบบฟอร์มเอกสารประกาศรวมทั้งอาคารตามมาตรฐานราชการ มีกำหนดชำระเงิน เลขที่บัญชีธนาคาร/QR Code และช่องลงชื่อเจ้าหน้าที่ สำหรับนำไปพิมพ์ติดบอร์ดประชาสัมพันธ์หรือบันทึกเป็น PDF ใน 1 คลิก<br />
                  - <b>พิมพ์สลิปใบแจ้งหนี้รายห้อง:</b> สามารถพิมพ์สลิปเฉพาะห้องเดี่ยว หรือเลือกหลายห้องเพื่อตัดแจกนักศึกษา/ผู้พักอาศัย<br />
                  - <b>วิธีบันทึกเป็นไฟล์ PDF:</b> เมื่อกดปุ่ม "พิมพ์" ให้เปลี่ยนเครื่องพิมพ์ (Destination) เป็น <b>"Save as PDF / บันทึกเป็น PDF"</b><br />
                  - <b>Google Sheets & Sites:</b> ที่แท็บ "Google & ส่งออกข้อมูล" สามารถดาวน์โหลด CSV, คัดลอกตารางไปวางใน Google Sheets และรับโค้ด Embed สำหรับฝังบน Google Sites ของหอพัก
                </p>
              </div>
            </div>
          </div>

          {/* Google Sites & Workspace Integration */}
          <div className="p-4 bg-indigo-950/70 border border-indigo-800/60 text-indigo-200 rounded-xl space-y-2">
            <span className="font-bold text-white text-sm flex items-center gap-1.5">
              <span>🌐 การนำไปใช้งานผ่าน Google Sites (กูเกิลไซต์) และ Google Sheets (กูเกิลชีต)</span>
            </span>
            <p className="text-indigo-200/90 leading-relaxed text-[11px]">
              • <b>Google Sites:</b> สามารถนำ URL ของเว็บแอปนี้ไปกด <b>"แทรก (Insert) &gt; ฝัง (Embed)"</b> บนหน้าเว็บ Google Sites ของหอพัก เพื่อให้เจ้าหน้าที่และนักศึกษาเข้าถึงระบบผ่านพอร์ทัลมหาวิทยาลัยได้โดยตรง<br />
              • <b>Google Sheets:</b> มีปุ่มคัดลอกตารางข้อมูลที่แยกคอลัมน์สมบูรณ์ เปิด Google Sheets แล้วกด <b>Ctrl + V</b> วางได้ทันที พร้อมสูตรคำนวณ
            </p>
          </div>

          {/* Database Section Explanation */}
          <div className="p-4 bg-slate-900 text-slate-300 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span>การบันทึกและการเก็บรักษาฐานข้อมูล</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              <b>1. บันทึกอัตโนมัติบนเบราว์เซอร์ (Web LocalStorage):</b> ทุกครั้งที่มีการจดมิเตอร์ แก้ไข หรือถ่ายรูป ระบบจะบันทึกลงในเครื่องของคุณทันที ปิดเครื่องหรือปิดเบราว์เซอร์ข้อมูลจะไม่หาย<br />
              <b>2. การสำรองข้อมูล (Backup):</b> คุณสามารถดาวน์โหลดไฟล์สำรองข้อมูล (JSON Backup) หรือไฟล์ Excel เก็บไว้ในคอมพิวเตอร์ได้ตลอดเวลาที่แท็บ "Google & ส่งออกข้อมูล"<br />
              <b>3. ใช้งานผ่านมือถือ:</b> สามารถเปิดใช้งานผ่านเบราว์เซอร์ของมือถือเครื่องใดก็ได้ที่เข้าถึง URL ของแอปนี้
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors"
          >
            เข้าใจแล้ว / ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
