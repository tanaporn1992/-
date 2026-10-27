import React, { useState, useEffect } from 'react';
import { X, Camera, Sparkles, Droplets, Zap, Check, AlertCircle } from 'lucide-react';
import { RoomDefinition, MeterRecord } from '../types';
import { formatNumber, formatMonthThai, getShortMonthYear, getPrevShortMonthYear } from '../data/dormData';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: RoomDefinition | null;
  currentRecord?: MeterRecord | null;
  previousRecord?: MeterRecord | null;
  selectedMonth: string;
  onSave: (record: MeterRecord) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const RecordModal: React.FC<RecordModalProps> = ({
  isOpen,
  onClose,
  room,
  currentRecord,
  previousRecord,
  selectedMonth,
  onSave,
  showToast,
}) => {
  const [waterPrev, setWaterPrev] = useState<number>(0);
  const [waterCurr, setWaterCurr] = useState<number>(0);
  const [occupants, setOccupants] = useState<number>(1);
  const [waterPhoto, setWaterPhoto] = useState<string | null>(null);

  const [elecPrev, setElecPrev] = useState<number>(0);
  const [elecCurr, setElecCurr] = useState<number>(0);
  const [elecPhoto, setElecPhoto] = useState<string | null>(null);

  const [remark, setRemark] = useState<string>('');
  const [isAiReadingWater, setIsAiReadingWater] = useState<boolean>(false);
  const [isAiReadingElec, setIsAiReadingElec] = useState<boolean>(false);

  useEffect(() => {
    if (room) {
      if (currentRecord) {
        setWaterPrev(currentRecord.waterPrev);
        setWaterCurr(currentRecord.waterCurr);
        setOccupants(currentRecord.occupants || 1);
        setWaterPhoto(currentRecord.waterPhoto || null);

        setElecPrev(currentRecord.elecPrev);
        setElecCurr(currentRecord.elecCurr);
        setElecPhoto(currentRecord.elecPhoto || null);

        setRemark(currentRecord.remark || '');
      } else {
        // Automatically default previous reading from prior month
        const prevWater = previousRecord ? previousRecord.waterCurr : 0;
        const prevElec = previousRecord ? previousRecord.elecCurr : 0;

        setWaterPrev(prevWater);
        setWaterCurr(prevWater);
        setOccupants(1);
        setWaterPhoto(null);

        setElecPrev(prevElec);
        setElecCurr(prevElec);
        setElecPhoto(null);

        setRemark('');
      }
    }
  }, [room, currentRecord, previousRecord]);

  if (!isOpen || !room) return null;

  // Real-time calculations
  const isFlatWater = room.waterType === 'flat_per_person';
  const waterUnits = isFlatWater ? 0 : Math.max(0, waterCurr - waterPrev);
  const waterCost = isFlatWater ? (occupants * 100) : (waterUnits * 20);

  const elecUnits = Math.max(0, elecCurr - elecPrev);
  const elecCost = elecUnits * 6;
  const totalAmount = waterCost + elecCost;

  // Handle Photo upload / camera
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>, meterType: 'water' | 'electricity') => {
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
          if (meterType === 'water') {
            setWaterPhoto(compressed);
            showToast('บันทึกรูปมิเตอร์น้ำเรียบร้อย');
          } else {
            setElecPhoto(compressed);
            showToast('บันทึกรูปมิเตอร์ไฟเรียบร้อย');
          }
        }
      };
    };
  };

  // AI OCR Reader
  const handleAiRead = async (meterType: 'water' | 'electricity') => {
    const photo = meterType === 'water' ? waterPhoto : elecPhoto;
    if (!photo) {
      showToast('กรุณาถ่ายภาพหรืออัปโหลดรูปมิเตอร์ก่อนใช้ระบบ AI อ่านตัวเลข', 'error');
      return;
    }

    if (meterType === 'water') setIsAiReadingWater(true);
    else setIsAiReadingElec(true);

    try {
      const response = await fetch('/api/read-meter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: photo, meterType }),
      });

      const resData = await response.json();
      if (resData.success && typeof resData.reading === 'number') {
        if (meterType === 'water') {
          setWaterCurr(resData.reading);
          showToast(`AI อ่านเลขมิเตอร์น้ำ: ${resData.reading}`);
        } else {
          setElecCurr(resData.reading);
          showToast(`AI อ่านเลขมิเตอร์ไฟ: ${resData.reading}`);
        }
      } else {
        showToast(resData.message || 'ไม่สามารถประมวลผลตัวเลขได้ชัดเจน กรุณากรอกด้วยตนเอง', 'error');
      }
    } catch (err: any) {
      showToast('เชื่อมต่อ AI ไม่สำเร็จ: ' + err.message, 'error');
    } finally {
      if (meterType === 'water') setIsAiReadingWater(false);
      else setIsAiReadingElec(false);
    }
  };

  const handleSave = () => {
    const timestamp = new Date().toISOString();
    const newRecord: MeterRecord = {
      roomId: room.id,
      buildingId: room.buildingId,
      buildingName: room.buildingName,
      roomNo: room.roomNo,
      floor: room.floor,
      waterType: room.waterType,

      waterPrev,
      waterCurr,
      occupants,
      waterUnits,
      waterCost,
      waterPhoto: waterPhoto || null,
      waterPhotoTimestamp: waterPhoto ? (currentRecord?.waterPhotoTimestamp || timestamp) : null,

      elecPrev,
      elecCurr,
      elecUnits,
      elecCost,
      elecPhoto: elecPhoto || null,
      elecPhotoTimestamp: elecPhoto ? (currentRecord?.elecPhotoTimestamp || timestamp) : null,

      remark,
      totalAmount,
      recordedAt: timestamp,
      verified: true,
    };

    onSave(newRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 no-print">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">{room.buildingName}</span>
              <span className="text-slate-400">·</span>
              <span className="text-xs text-slate-300">ชั้น {room.floor}</span>
            </div>
            <h3 className="text-xl font-bold tracking-tight">บันทึกมิเตอร์ ห้อง {room.roomNo}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* WATER SECTION */}
          <div className="p-4 bg-sky-50/50 border border-sky-100 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-bold text-sky-900">
                <Droplets className="w-4 h-4 text-sky-600" />
                <span>ค่าน้ำประปา</span>
              </span>
              <span className="font-medium text-slate-500">
                {isFlatWater ? 'เหมาจ่าย 100 บ./คน' : 'ตามหน่วย (20 บ./หน่วย)'}
              </span>
            </div>

            {isFlatWater ? (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-600">จำนวนผู้พักอาศัย (คน):</label>
                <input
                  type="number"
                  min="0"
                  value={occupants}
                  onChange={(e) => setOccupants(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <div className="text-xs flex justify-between pt-1 text-slate-600">
                  <span>อัตรา 100 บาท/คน</span>
                  <span>เป็นเงิน: <b className="text-sky-800">฿{formatNumber(waterCost)}</b></span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-500 mb-1">
                      เลขตั้งต้น ({getPrevShortMonthYear(selectedMonth)}):
                    </label>
                    <input
                      type="number"
                      value={waterPrev}
                      onChange={(e) => setWaterPrev(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 font-mono text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      เลขจดใหม่ ({getShortMonthYear(selectedMonth)}):
                    </label>
                    <input
                      type="number"
                      value={waterCurr}
                      onChange={(e) => setWaterCurr(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-sky-400 rounded-lg px-3 py-1.5 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="text-xs flex justify-between pt-1 border-t border-sky-100 text-slate-600 font-medium">
                  <span>ใช้น้ำ: <b className="text-sky-800 font-mono">{waterUnits}</b> หน่วย</span>
                  <span>เป็นเงิน: <b className="text-sky-800">฿{formatNumber(waterCost)}</b></span>
                </div>

                {/* Photo attachment & AI */}
                <div className="pt-2 border-t border-sky-100 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium cursor-pointer transition-colors">
                      <Camera className="w-3.5 h-3.5 text-slate-500" />
                      <span>{waterPhoto ? 'เปลี่ยนภาพ' : 'ถ่ายภาพมิเตอร์น้ำ'}</span>
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
                        disabled={isAiReadingWater}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 font-semibold transition-colors"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${isAiReadingWater ? 'animate-spin' : ''}`} />
                        <span>{isAiReadingWater ? 'AI อ่าน...' : 'AI สแกนเลข'}</span>
                      </button>
                    )}
                  </div>

                  {waterPhoto && (
                    <img
                      src={waterPhoto}
                      alt="water thumb"
                      className="w-10 h-10 object-cover rounded border border-slate-300"
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ELECTRICITY SECTION */}
          <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-bold text-amber-900">
                <Zap className="w-4 h-4 text-amber-600" />
                <span>ค่าไฟฟ้า</span>
              </span>
              <span className="font-medium text-slate-500 font-mono">6 บาท/หน่วย</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">
                  เลขตั้งต้น ({getPrevShortMonthYear(selectedMonth)}):
                </label>
                <input
                  type="number"
                  value={elecPrev}
                  onChange={(e) => setElecPrev(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 font-mono text-slate-700"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  เลขจดใหม่ ({getShortMonthYear(selectedMonth)}):
                </label>
                <input
                  type="number"
                  value={elecCurr}
                  onChange={(e) => setElecCurr(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-amber-400 rounded-lg px-3 py-1.5 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="text-xs flex justify-between pt-1 border-t border-amber-100 text-slate-600 font-medium">
              <span>ใช้ไฟ: <b className="text-amber-800 font-mono">{elecUnits}</b> หน่วย</span>
              <span>เป็นเงิน: <b className="text-amber-800">฿{formatNumber(elecCost)}</b></span>
            </div>

            {/* Photo attachment & AI */}
            <div className="pt-2 border-t border-amber-100 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium cursor-pointer transition-colors">
                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                  <span>{elecPhoto ? 'เปลี่ยนภาพ' : 'ถ่ายภาพมิเตอร์ไฟ'}</span>
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
                    disabled={isAiReadingElec}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold transition-colors"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isAiReadingElec ? 'animate-spin' : ''}`} />
                    <span>{isAiReadingElec ? 'AI อ่าน...' : 'AI สแกนเลข'}</span>
                  </button>
                )}
              </div>

              {elecPhoto && (
                <img
                  src={elecPhoto}
                  alt="elec thumb"
                  className="w-10 h-10 object-cover rounded border border-slate-300"
                />
              )}
            </div>
          </div>

          {/* Remarks Field */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              หมายเหตุ (เช่น นักศึกษาจีน, ปรับปรุง, นักฟุตบอล, summer):
            </label>
            <input
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="ระบุหมายเหตุถ้ามี..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Total Cost Strip */}
          <div className="p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-300">ยอดรวมทั้งสิ้น (ค่าน้ำ + ค่าไฟ):</span>
            <span className="text-lg font-black tabular-nums text-amber-400">฿{formatNumber(totalAmount)}</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-sky-700 hover:bg-sky-800 text-white font-semibold transition-colors shadow-xs"
          >
            <Check className="w-4 h-4" />
            <span>บันทึกข้อมูลห้อง {room.roomNo}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
