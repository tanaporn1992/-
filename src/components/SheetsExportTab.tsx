import React, { useRef, useState } from 'react';
import {
  Download,
  Copy,
  FileSpreadsheet,
  HardDrive,
  Upload,
  Database,
  ShieldCheck,
  Globe,
  ExternalLink,
  Code,
  Check,
  Presentation,
  BookOpen,
} from 'lucide-react';
import { MeterRecord } from '../types';

interface SheetsExportTabProps {
  records: Record<string, MeterRecord>;
  allRecords?: Record<string, Record<string, MeterRecord>>;
  onRestoreAllRecords?: (imported: Record<string, Record<string, MeterRecord>>) => void;
  selectedMonth: string;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const SheetsExportTab: React.FC<SheetsExportTabProps> = ({
  records,
  allRecords,
  onRestoreAllRecords,
  selectedMonth,
  showToast,
}) => {
  const recordsList = Object.values(records);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState<string>('ALL');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // App URL for Google Sites Embedding
  const appLiveUrl = 'https://ais-pre-sdc5uepryzttbeg5znfv64-724996936853.asia-southeast1.run.app';
  const iframeEmbedCode = `<iframe src="${appLiveUrl}" width="100%" height="900" frameborder="0" allow="camera; microphone" style="border: 0; width: 100%; height: 900px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);"></iframe>`;

  // Filtered records for selective building copy
  const filteredRecords = selectedBuildingFilter === 'ALL'
    ? recordsList
    : recordsList.filter((r) => r.buildingId === selectedBuildingFilter || r.buildingName.includes(selectedBuildingFilter));

  const downloadCSV = () => {
    if (filteredRecords.length === 0) {
      showToast('ไม่มีข้อมูลสำหรับส่งออกในเดือนนี้', 'error');
      return;
    }

    let csv = '\uFEFF'; // UTF-8 BOM
    csv += 'ประจำเดือน,ชื่ออาคาร,เลขห้อง,ชั้น,ประเภทค่าน้ำ,เลขตั้งต้นน้ำ(ยกมา),เลขจดใหม่น้ำ/ผู้พัก,หน่วยน้ำใช้,ค่าน้ำ(บาท),เลขตั้งต้นไฟ(ยกมา),เลขจดใหม่ไฟ,หน่วยไฟใช้,ค่าไฟ(บาท),รวมเงินทั้งสิ้น(บาท),หมายเหตุ,สถานะภาพถ่าย\n';

    filteredRecords.forEach((r) => {
      const wVal = r.waterType === 'flat_per_person' ? `${r.occupants || 1} คน` : r.waterCurr;
      const photoStatus = (r.waterPhoto && r.elecPhoto) ? 'รูปครบ' : (!r.waterPhoto && !r.elecPhoto ? 'ไม่มีรูป' : 'มีรูปบางส่วน');
      csv += `"${selectedMonth}","${r.buildingName}","${r.roomNo}","${r.floor}","${r.waterType}","${r.waterPrev}","${wVal}","${r.waterUnits}","${r.waterCost}","${r.elecPrev}","${r.elecCurr}","${r.elecUnits}","${r.elecCost}","${r.totalAmount}","${r.remark || ''}","${photoStatus}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `รายงานมิเตอร์_${selectedMonth}_${selectedBuildingFilter}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    showToast('ดาวน์โหลดไฟล์ CSV เรียบร้อยแล้ว (เปิดใน Excel/Sheets ได้ภาษาไทยสมบูรณ์)');
  };

  const copyToClipboard = () => {
    if (filteredRecords.length === 0) {
      showToast('ไม่มีข้อมูลสำหรับคัดลอก', 'error');
      return;
    }

    let tsv = 'ประจำเดือน\tชื่ออาคาร\tเลขห้อง\tชั้น\tประเภทค่าน้ำ\tเลขตั้งต้นน้ำ(ยกมา)\tเลขจดใหม่น้ำ/ผู้พัก\tหน่วยน้ำใช้\tค่าน้ำ(บาท)\tเลขตั้งต้นไฟ(ยกมา)\tเลขจดใหม่ไฟ\tหน่วยไฟใช้\tค่าไฟ(บาท)\tรวมเงินทั้งสิ้น(บาท)\tหมายเหตุ\n';

    filteredRecords.forEach((r) => {
      const wVal = r.waterType === 'flat_per_person' ? `${r.occupants || 1} คน` : r.waterCurr;
      tsv += `${selectedMonth}\t${r.buildingName}\t${r.roomNo}\t${r.floor}\t${r.waterType}\t${r.waterPrev}\t${wVal}\t${r.waterUnits}\t${r.waterCost}\t${r.elecPrev}\t${r.elecCurr}\t${r.elecUnits}\t${r.elecCost}\t${r.totalAmount}\t${r.remark || ''}\n`;
    });

    navigator.clipboard.writeText(tsv).then(() => {
      setCopiedType('sheets');
      setTimeout(() => setCopiedType(null), 3000);
      showToast('คัดลอกข้อมูลตารางลง Clipboard แล้ว! เปิด Google Sheets แล้วกด Ctrl+V เพื่อวางตารางได้ทันที');
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = tsv;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedType('sheets');
      setTimeout(() => setCopiedType(null), 3000);
      showToast('คัดลอกข้อมูลตารางลง Clipboard แล้ว! เปิด Google Sheets แล้วกด Ctrl+V เพื่อวางตารางได้ทันที');
    });
  };

  const copyText = (text: string, type: string, message: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 3000);
      showToast(message);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 3000);
      showToast(message);
    });
  };

  // Full Database JSON Backup
  const downloadDatabaseBackup = () => {
    if (!allRecords || Object.keys(allRecords).length === 0) {
      showToast('ไม่มีข้อมูลฐานข้อมูลสำหรับสำรอง', 'error');
      return;
    }

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(allRecords, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `dorm_meter_database_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast('ดาวน์โหลดไฟล์สำรองฐานข้อมูล (JSON) สำเร็จแล้ว เก็บไว้เพื่อความปลอดภัยได้ทันที');
  };

  // Restore Database from JSON
  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (typeof parsed === 'object' && parsed !== null) {
          if (window.confirm('คุณต้องการนำเข้าไฟล์สำรองข้อมูลนี้หรือไม่? ข้อมูลปัจจุบันจะถูกอัปเดตด้วยข้อมูลจากไฟล์')) {
            onRestoreAllRecords?.(parsed);
            showToast('กู้คืนฐานข้อมูลมิเตอร์เรียบร้อยแล้ว');
          }
        } else {
          showToast('รูปแบบไฟล์สำรองข้อมูลไม่ถูกต้อง', 'error');
        }
      } catch (err) {
        showToast('ไม่สามารถอ่านไฟล์ JSON ได้', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* SECTION 1: Google Sites (กูเกิลไซต์) Embed Guide */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white rounded-2xl p-6 sm:p-7 shadow-lg space-y-5 border border-indigo-800/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-indigo-800/50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-400/30">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-700/50">
                  Google Sites (กูเกิลไซต์)
                </span>
                <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  พร้อมฝังใช้งานทันที
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-white mt-1">
                นำระบบไปฝังใช้งานบน Google Sites (เว็บไซต์หอพัก/มหาวิทยาลัย)
              </h2>
            </div>
          </div>

          <a
            href={appLiveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-colors self-start sm:self-auto shadow-sm"
          >
            <span>เปิดลิงก์แอปจริง</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <p className="text-xs sm:text-sm text-indigo-200/90 leading-relaxed">
          ท่านสามารถนำระบบจดมิเตอร์นี้ไปติดตั้งบน <b>Google Sites</b> ของทางหอพัก เพื่อให้เจ้าหน้าที่และนักศึกษาเปิดใช้งานได้โดยตรงบนเว็บไซต์ของมหาวิทยาลัย โดยไม่ต้องติดตั้งโปรแกรมใดๆ
        </p>

        {/* 3 Step Instructions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-indigo-800/40 space-y-1">
            <span className="font-bold text-amber-300 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center text-[11px]">1</span>
              <span>คัดลอก URL หรือโค้ด</span>
            </span>
            <p className="text-slate-300 text-[11px] pt-1">
              กดปุ่มคัดลอก <b>"URL เว็บแอป"</b> หรือ <b>"โค้ดฝัง (Embed Code)"</b> ด้านล่างนี้
            </p>
          </div>

          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-indigo-800/40 space-y-1">
            <span className="font-bold text-sky-300 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-sky-400/20 text-sky-300 flex items-center justify-center text-[11px]">2</span>
              <span>ไปที่ Google Sites</span>
            </span>
            <p className="text-slate-300 text-[11px] pt-1">
              เปิด Google Sites ของท่าน เลือกเมนูขวา <b>แทรก (Insert) &gt; ฝัง (Embed)</b> แล้วเลือก <b>ตาม URL</b> หรือ <b>ฝังโค้ด</b>
            </p>
          </div>

          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-indigo-800/40 space-y-1">
            <span className="font-bold text-emerald-300 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-400/20 text-emerald-300 flex items-center justify-center text-[11px]">3</span>
              <span>ปรับขนาด & เผยแพร่</span>
            </span>
            <p className="text-slate-300 text-[11px] pt-1">
              ลากขยายกรอบหน้าต่างแอปให้เต็มความกว้างหน้าจอ แล้วกด <b>"เผยแพร่ (Publish)"</b> เว็บไซต์ใช้งานได้ทันที
            </p>
          </div>
        </div>

        {/* Quick Copy Inputs */}
        <div className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-bold text-indigo-300 mb-1">
              วิธีที่ 1: ฝังโดยใช้ URL เว็บแอป (แนะนำ - สะดวกที่สุด)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={appLiveUrl}
                className="w-full bg-slate-950/80 border border-indigo-700/60 rounded-xl px-3 py-2 text-xs font-mono text-indigo-100 select-all focus:outline-none"
              />
              <button
                onClick={() => copyText(appLiveUrl, 'url', 'คัดลอก URL สำหรับ Google Sites แล้ว!')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-colors shrink-0 flex items-center gap-1.5 shadow-sm"
              >
                {copiedType === 'url' ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedType === 'url' ? 'คัดลอกแล้ว' : 'คัดลอก URL'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-indigo-300 mb-1">
              วิธีที่ 2: ฝังด้วยโค้ด HTML iframe (สำหรับปรับความสูงหรือความกว้าง)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={iframeEmbedCode}
                className="w-full bg-slate-950/80 border border-indigo-700/60 rounded-xl px-3 py-2 text-xs font-mono text-indigo-100 select-all focus:outline-none text-[11px]"
              />
              <button
                onClick={() => copyText(iframeEmbedCode, 'iframe', 'คัดลอกโค้ด iframe สำหรับ Google Sites แล้ว!')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors shrink-0 flex items-center gap-1.5 border border-indigo-700/50"
              >
                {copiedType === 'iframe' ? <Check className="w-4 h-4 text-emerald-300" /> : <Code className="w-4 h-4" />}
                <span>{copiedType === 'iframe' ? 'คัดลอกแล้ว' : 'คัดลอกโค้ด'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Google Sheets (กูเกิลชีต) & Excel Export */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  Google Sheets & Microsoft Excel
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
                ส่งออกและคัดลอกข้อมูลไปวางใน Google Sheets
              </h2>
            </div>
          </div>

          <a
            href="https://sheets.new"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs transition-colors border border-emerald-300 self-start sm:self-auto shadow-xs"
            title="เปิด Google Sheets เปล่าหน้าใหม่ทันที"
          >
            <span>เปิด Google Sheets ใหม่</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Building Selector for Partial Export */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
          <span className="font-semibold text-slate-700">เลือกอาคารที่ต้องการส่งออก:</span>
          <select
            value={selectedBuildingFilter}
            onChange={(e) => setSelectedBuildingFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-800 focus:outline-none"
          >
            <option value="ALL">ทุกอาคารทั้งหมด ({recordsList.length} ห้อง)</option>
            <option value="thachana">หอพักท่าชนะ</option>
            <option value="thaphet">หอพักท่าเพชร</option>
            <option value="thathong">หอพักท่าทอง</option>
            <option value="prapassorn">หอพักประภัสสร</option>
            <option value="ratchaprapha">หอพักรัชชประภา</option>
            <option value="wiphawadi">หอพักวิภาวดี</option>
            <option value="chaiya">หอพักไชยา</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Direct Clipboard Copy for Google Sheets */}
          <div className="border border-sky-200 rounded-xl p-5 bg-sky-50/40 flex flex-col justify-between hover:border-sky-300 transition-colors space-y-3">
            <div>
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-1">
                <Copy className="w-4 h-4 text-sky-600" />
                <span>คัดลอกตารางไปวางใน Google Sheets</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                คัดลอกข้อมูลตารางลง Clipboard เมื่อกดปุ่มแล้ว ให้สลับไปที่หน้า <b>Google Sheets</b> แล้วกดแป้นพิมพ์ <b>Ctrl + V</b> (หรือ Cmd+V บน Mac) เพื่อวางตารางได้ทันที คอลัมน์แยกเรียบร้อย
              </p>
            </div>
            <button
              onClick={copyToClipboard}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold shadow-xs transition-colors"
            >
              {copiedType === 'sheets' ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copiedType === 'sheets' ? 'คัดลอกลง Clipboard แล้ว!' : 'คัดลอกตารางสำหรับ Google Sheets'}</span>
            </button>
          </div>

          {/* CSV Download */}
          <div className="border border-emerald-200 rounded-xl p-5 bg-emerald-50/40 flex flex-col justify-between hover:border-emerald-300 transition-colors space-y-3">
            <div>
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-1">
                <Download className="w-4 h-4 text-emerald-600" />
                <span>ดาวน์โหลดไฟล์ CSV (เปิดใน Google Sheets / Excel)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                ไฟล์ CSV เข้ารหัส UTF-8 BOM รองรับภาษาไทย 100% สามารถนำเข้า (File &gt; Import) ใน Google Sheets หรือดับเบิลคลิกเปิดใน Excel ได้ทันทีโดยสระไม่เพี้ยน
              </p>
            </div>
            <button
              onClick={downloadCSV}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>ดาวน์โหลดไฟล์ CSV ({filteredRecords.length} ห้อง)</span>
            </button>
          </div>
        </div>

        {/* SECTION 2.1: Google Slides (กูเกิลสไลด์) Tips */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3 text-xs text-slate-700">
          <Presentation className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-slate-900">การนำเสนอผ่าน Google Slides (กูเกิลสไลด์):</span>
            <p className="text-slate-600 leading-relaxed">
              หากต้องการนำข้อมูลไปนำเสนอในที่ประชุม สามารถคัดลอกข้อมูลข้างต้นไปวางใน Google Sheets ก่อน แล้วกดสร้างแผนภูมิ หรือเปิดแท็บ <b>"สรุปค่าใช้จ่ายอัตโนมัติ"</b> แล้วจับภาพหน้าจอกราฟและตารางสรุปนำไปวางใน Google Slides ได้ทันที
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3: Database Backup & Persistence Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="p-3 bg-amber-100 text-amber-800 rounded-xl">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              การจัดเก็บและการสำรองฐานข้อมูล (Database Storage & Backup)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ระบบบันทึกข้อมูลทุกรายการลงในฐานข้อมูลเครื่องของคุณโดยอัตโนมัติ และสามารถสำรองไฟล์เก็บไว้ได้
            </p>
          </div>
        </div>

        {/* Database Status Alert */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 text-xs text-emerald-900">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">สถานะฐานข้อมูล: บันทึกอัตโนมัติ (Auto-Saved)</span>
            <p className="text-emerald-800 leading-relaxed">
              ข้อมูลประวัติการจดมิเตอร์ รูปถ่ายหลักฐาน และค่าใช้จ่ายทั้งหมดถูกบันทึกอย่างปลอดภัยในฐานข้อมูลเบราว์เซอร์ (Web LocalStorage) 
              แม้ปิดหน้าต่าง ปิดคอมพิวเตอร์ หรือเปิดเข้ามาใหม่ ข้อมูลทั้งหมดจะไม่สูญหาย
            </p>
          </div>
        </div>

        {/* Backup & Restore Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <div>
              <span className="font-bold text-slate-900 text-xs block">สำรองฐานข้อมูลทั้งหมด (Full Backup)</span>
              <p className="text-[11px] text-slate-500 mt-1">
                ดาวน์โหลดไฟล์ฐานข้อมูล <b>.json</b> เก็บไว้ในคอมพิวเตอร์ หรือส่งต่อให้เจ้าหน้าที่คนอื่น
              </p>
            </div>
            <button
              onClick={downloadDatabaseBackup}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors shadow-xs w-full"
            >
              <HardDrive className="w-4 h-4 text-amber-400" />
              <span>ดาวน์โหลดไฟล์สำรองฐานข้อมูล (.JSON)</span>
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <div>
              <span className="font-bold text-slate-900 text-xs block">กู้คืน / ย้ายฐานข้อมูล (Restore Database)</span>
              <p className="text-[11px] text-slate-500 mt-1">
                นำไฟล์สำรอง <b>.json</b> ที่ดาวน์โหลดไว้มากู้คืนลงเครื่องใหม่ได้ทันที
              </p>
            </div>
            <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs transition-colors border border-slate-300 cursor-pointer shadow-xs w-full">
              <Upload className="w-4 h-4 text-sky-600" />
              <span>เลือกไฟล์สำรองเพื่อกู้คืน (.JSON)</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleRestoreFile}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
