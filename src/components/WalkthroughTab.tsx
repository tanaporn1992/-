import React, { useState, useEffect } from 'react';
import { Camera, ChevronLeft, ChevronRight, Sparkles, Check, Droplets, Zap, ShieldCheck } from 'lucide-react';
import { RoomDefinition, MeterRecord, BuildingConfig } from '../types';
import { formatNumber, formatMonthThai, getShortMonthYear, getPrevShortMonthYear } from '../data/dormData';

interface WalkthroughTabProps {
  masterRooms: RoomDefinition[];
  records: Record<string, MeterRecord>;
  selectedMonth: string;
  buildings: BuildingConfig[];
  onSaveRecord: (record: MeterRecord) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const WalkthroughTab: React.FC<WalkthroughTabProps> = ({
  masterRooms,
  records,
  selectedMonth,
  buildings,
  onSaveRecord,
  showToast,
}) => {
  const [selectedBuilding, setSelectedBuilding] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'ALL'>('PENDING');
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Form values
  const [waterPrev, setWaterPrev] = useState<number>(0);
  const [waterCurr, setWaterCurr] = useState<number>(0);
  const [occupants, setOccupants] = useState<number>(1);
  const [waterPhoto, setWaterPhoto] = useState<string | null>(null);

  const [elecPrev, setElecPrev] = useState<number>(0);
  const [elecCurr, setElecCurr] = useState<number>(0);
  const [elecPhoto, setElecPhoto] = useState<string | null>(null);

  const [remark, setRemark] = useState<string>('');
  const [isAiWater, setIsAiWater] = useState<boolean>(false);
  const [isAiElec, setIsAiElec] = useState<boolean>(false);

  // Filtered walkthrough list
  const queue = masterRooms.filter((r) => {
    if (selectedBuilding !== 'ALL' && r.buildingId !== selectedBuilding) return false;
    if (statusFilter === 'PENDING' && records[r.id]) return false;
    return true;
  });

  const currentRoom: RoomDefinition | undefined = queue[currentIndex];

  useEffect(() => {
    if (currentRoom) {
      const rec = records[currentRoom.id];
      if (rec) {
        setWaterPrev(rec.waterPrev);
        setWaterCurr(rec.waterCurr);
        setOccupants(rec.occupants || 1);
        setWaterPhoto(rec.waterPhoto || null);
        setElecPrev(rec.elecPrev);
        setElecCurr(rec.elecCurr);
        setElecPhoto(rec.elecPhoto || null);
        setRemark(rec.remark || '');
      } else {
        setWaterPrev(0);
        setWaterCurr(0);
        setOccupants(1);
        setWaterPhoto(null);
        setElecPrev(0);
        setElecCurr(0);
        setElecPhoto(null);
        setRemark('');
      }
    }
  }, [currentRoom, records]);

  if (!currentRoom || queue.length === 0) {
    return (
      <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
        <Check className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900">บันทึกมิเตอร์ครบเรียบร้อยแล้ว!</h3>
        <p className="text-xs text-slate-500 mt-1">
          ไม่มีห้องพักที่ค้างจดในอาคารที่เลือก
        </p>
        <button
          onClick={() => setStatusFilter('ALL')}
          className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
        >
          ดูห้องพักทั้งหมดในอาคารนี้
        </button>
      </div>
    );
  }

  const isFlatWater = currentRoom.waterType === 'flat_per_person';
  const waterUnits = isFlatWater ? 0 : Math.max(0, waterCurr - waterPrev);
  const waterCost = isFlatWater ? (occupants * 100) : (waterUnits * 20);

  const elecUnits = Math.max(0, elecCurr - elecPrev);
  const elecCost = elecUnits * 6;
  const totalAmount = waterCost + elecCost;

  // Handle Photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'water' | 'electricity') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scale = Math.min(1, MAX_WIDTH / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/jpeg', 0.75);
          if (type === 'water') setWaterPhoto(compressed);
          else setElecPhoto(compressed);
        }
      };
    };
  };

  // AI OCR Reader
  const handleAiRead = async (type: 'water' | 'electricity') => {
    const photo = type === 'water' ? waterPhoto : elecPhoto;
    if (!photo) {
      showToast('กรุณาถ่ายภาพมิเตอร์ก่อน', 'error');
      return;
    }

    if (type === 'water') setIsAiWater(true);
    else setIsAiElec(true);

    try {
      const response = await fetch('/api/read-meter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: photo, meterType: type }),
      });
      const data = await response.json();
      if (data.success && typeof data.reading === 'number') {
        if (type === 'water') {
          setWaterCurr(data.reading);
          showToast(`AI อ่านเลขมิเตอร์น้ำ: ${data.reading}`);
        } else {
          setElecCurr(data.reading);
          showToast(`AI อ่านเลขมิเตอร์ไฟ: ${data.reading}`);
        }
      } else {
        showToast(data.message || 'ไม่สามารถสแกนตัวเลขได้ชัดเจน', 'error');
      }
    } catch (err: any) {
      showToast('เชื่อมต่อ AI ไม่สำเร็จ: ' + err.message, 'error');
    } finally {
      if (type === 'water') setIsAiWater(false);
      else setIsAiElec(false);
    }
  };

  const handleSaveAndNext = () => {
    const timestamp = new Date().toISOString();
    const rec: MeterRecord = {
      roomId: currentRoom.id,
      buildingId: currentRoom.buildingId,
      buildingName: currentRoom.buildingName,
      roomNo: currentRoom.roomNo,
      floor: currentRoom.floor,
      waterType: currentRoom.waterType,

      waterPrev,
      waterCurr,
      occupants,
      waterUnits,
      waterCost,
      waterPhoto: waterPhoto || null,
      waterPhotoTimestamp: waterPhoto ? timestamp : null,

      elecPrev,
      elecCurr,
      elecUnits,
      elecCost,
      elecPhoto: elecPhoto || null,
      elecPhotoTimestamp: elecPhoto ? timestamp : null,

      remark,
      totalAmount,
      recordedAt: timestamp,
      verified: true,
    };

    onSaveRecord(rec);
    showToast(`บันทึกมิเตอร์ห้อง ${currentRoom.roomNo} สำเร็จ`);

    if (statusFilter === 'PENDING') {
      setCurrentIndex(0);
    } else if (currentIndex < queue.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Configuration Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <label className="text-slate-500 font-medium">อาคารที่เดินจด:</label>
          <select
            value={selectedBuilding}
            onChange={(e) => {
              setSelectedBuilding(e.target.value);
              setCurrentIndex(0);
            }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-semibold focus:outline-none"
          >
            <option value="ALL">ทุกอาคาร</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-slate-500">
          ลำดับที่ <b className="text-slate-900 tabular-nums">{currentIndex + 1}</b> จาก{' '}
          <b className="text-slate-900 tabular-nums">{queue.length}</b> ห้อง
        </div>
      </div>

      {/* Main Walkthrough Card */}
      <div className="bg-white border-2 border-sky-600/70 rounded-2xl p-6 shadow-md space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-700 uppercase tracking-wide">
              <span>หอพัก{currentRoom.buildingName}</span>
              <span>·</span>
              <span>ชั้น {currentRoom.floor}</span>
            </div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight mt-0.5">
              ห้อง {currentRoom.roomNo}
            </h3>
          </div>

          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
              isFlatWater ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
            }`}
          >
            {isFlatWater ? 'เหมาค่าน้ำ 100 บ./คน' : 'ค่าน้ำตามหน่วย (20 บ./หน่วย)'}
          </span>
        </div>

        {/* Meter Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Water Meter */}
          <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900">
              <Droplets className="w-4 h-4 text-sky-600" />
              <span>มิเตอร์น้ำประปา</span>
            </div>

            {isFlatWater ? (
              <div>
                <label className="block text-xs text-slate-600 mb-1 font-medium">จำนวนผู้พัก (คน):</label>
                <input
                  type="number"
                  min="0"
                  value={occupants}
                  onChange={(e) => setOccupants(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-white border border-sky-300 rounded-lg px-3 py-2 text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <div className="mt-2 text-xs flex justify-between font-medium text-slate-600">
                  <span>อัตรา 100 บ./คน</span>
                  <span>เป็นเงิน: <b className="text-sky-800">฿{formatNumber(waterCost)}</b></span>
                </div>
              </div>
            ) : (
              <div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">เลขตั้งต้น ({getPrevShortMonthYear(selectedMonth)}):</label>
                    <input
                      type="number"
                      value={waterPrev}
                      onChange={(e) => setWaterPrev(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-700 font-bold mb-0.5">เลขจดใหม่ ({getShortMonthYear(selectedMonth)}):</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={waterCurr}
                      onChange={(e) => setWaterCurr(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border-2 border-sky-500 rounded-xl px-3 py-2 text-xl font-bold font-mono text-slate-900 focus:outline-none min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="mt-2 text-xs flex justify-between font-medium text-slate-600 pt-1 border-t border-sky-100">
                  <span>ใช้: <b className="text-sky-800 font-mono">{waterUnits}</b> หน่วย</span>
                  <span>เป็นเงิน: <b className="text-sky-800">฿{formatNumber(waterCost)}</b></span>
                </div>

                {/* Photo & AI */}
                <div className="mt-3 pt-2 border-t border-sky-100 flex items-center justify-between gap-2">
                  <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50 min-h-[40px] shadow-xs">
                    <Camera className="w-4 h-4 text-sky-600" />
                    <span>{waterPhoto ? 'ถ่ายใหม่' : 'ถ่ายรูปน้ำ'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => handlePhotoSelect(e, 'water')}
                    />
                  </label>

                  {waterPhoto && (
                    <button
                      onClick={() => handleAiRead('water')}
                      disabled={isAiWater}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-sky-100 text-sky-900 text-xs font-bold hover:bg-sky-200 min-h-[40px]"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isAiWater ? 'animate-spin' : ''}`} />
                      <span>{isAiWater ? 'สแกน...' : 'AI สแกน'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Electricity Meter */}
          <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <Zap className="w-4 h-4 text-amber-600" />
              <span>มิเตอร์ไฟฟ้า</span>
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">เลขตั้งต้น ({getPrevShortMonthYear(selectedMonth)}):</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={elecPrev}
                  onChange={(e) => setElecPrev(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-700 font-bold mb-0.5">เลขจดใหม่ ({getShortMonthYear(selectedMonth)}):</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={elecCurr}
                  onChange={(e) => setElecCurr(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border-2 border-amber-500 rounded-xl px-3 py-2 text-xl font-bold font-mono text-slate-900 focus:outline-none min-h-[44px]"
                />
              </div>
            </div>

            <div className="mt-2 text-xs flex justify-between font-medium text-slate-600 pt-1 border-t border-amber-100">
              <span>ใช้: <b className="text-amber-800 font-mono">{elecUnits}</b> หน่วย</span>
              <span>เป็นเงิน: <b className="text-amber-800">฿{formatNumber(elecCost)}</b></span>
            </div>

            {/* Photo & AI */}
            <div className="mt-3 pt-2 border-t border-amber-100 flex items-center justify-between gap-2">
              <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50 min-h-[40px] shadow-xs">
                <Camera className="w-4 h-4 text-amber-600" />
                <span>{elecPhoto ? 'ถ่ายใหม่' : 'ถ่ายรูปไฟ'}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handlePhotoSelect(e, 'electricity')}
                />
              </label>

              {elecPhoto && (
                <button
                  onClick={() => handleAiRead('electricity')}
                  disabled={isAiElec}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold hover:bg-amber-200 min-h-[40px]"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isAiElec ? 'animate-spin' : ''}`} />
                  <span>{isAiElec ? 'สแกน...' : 'AI สแกน'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Remark Field */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">หมายเหตุ:</label>
          <input
            type="text"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="เช่น ปรับปรุง, นักศึกษาจีน, summer, นักฟุตบอล..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        {/* Footer Actions - Optimized for Mobile Thumb Reach */}
        <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center justify-between w-full sm:w-auto gap-2">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 disabled:opacity-40 min-h-[44px]"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>ห้องก่อนหน้า</span>
            </button>

            <button
              onClick={() => {
                if (currentIndex < queue.length - 1) setCurrentIndex((prev) => prev + 1);
              }}
              className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 min-h-[44px] flex items-center"
            >
              ข้ามห้องนี้
            </button>
          </div>

          <button
            onClick={handleSaveAndNext}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-700 to-sky-800 hover:from-sky-800 hover:to-sky-900 text-white text-sm font-black shadow-md transition-all active:scale-95 min-h-[48px]"
          >
            <span>บันทึก & ห้องถัดไป</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
