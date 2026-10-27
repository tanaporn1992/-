import React, { useState, useMemo } from 'react';
import { Camera, Image, Printer, Search, Sparkles, ZoomIn, Check, AlertCircle, Droplets, Zap, ShieldCheck } from 'lucide-react';
import { RoomDefinition, MeterRecord, BuildingConfig } from '../types';
import { formatNumber, formatMonthThai, getShortMonthYear, getPrevShortMonthYear } from '../data/dormData';
import { PhotoZoomModal } from './PhotoZoomModal';

interface PhotoReportTabProps {
  masterRooms: RoomDefinition[];
  records: Record<string, MeterRecord>;
  selectedMonth: string;
  buildings: BuildingConfig[];
  onUpdateRecord: (roomId: string, partial: Partial<MeterRecord>) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const PhotoReportTab: React.FC<PhotoReportTabProps> = ({
  masterRooms,
  records,
  selectedMonth,
  buildings,
  onUpdateRecord,
  showToast,
}) => {
  const [selectedBuilding, setSelectedBuilding] = useState<string>('ALL');
  const [selectedFloor, setSelectedFloor] = useState<string>('ALL');
  const [photoFilter, setPhotoFilter] = useState<'ALL' | 'COMPLETE' | 'MISSING_ANY' | 'MISSING_WATER' | 'MISSING_ELEC'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [readingAiLoadingRoomId, setReadingAiLoadingRoomId] = useState<string | null>(null);

  // Zoom modal state
  const [zoomModal, setZoomModal] = useState<{
    isOpen: boolean;
    photoUrl: string | null;
    title: string;
    roomNo: string;
    meterType: 'water' | 'electricity';
    currentReading?: number;
    timestamp?: string | null;
    roomId?: string;
  }>({
    isOpen: false,
    photoUrl: null,
    title: '',
    roomNo: '',
    meterType: 'water',
  });

  // Calculate items with records
  const items = useMemo(() => {
    return masterRooms.map((room) => {
      const rec = records[room.id];
      const hasWaterPhoto = !!rec?.waterPhoto;
      const hasElecPhoto = !!rec?.elecPhoto;
      const isComplete = room.waterType === 'flat_per_person' ? hasElecPhoto : (hasWaterPhoto && hasElecPhoto);

      return {
        room,
        rec,
        hasWaterPhoto,
        hasElecPhoto,
        isComplete,
      };
    });
  }, [masterRooms, records]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(({ room, hasWaterPhoto, hasElecPhoto, isComplete }) => {
      if (selectedBuilding !== 'ALL' && room.buildingId !== selectedBuilding) return false;
      if (selectedFloor !== 'ALL' && room.floor !== parseInt(selectedFloor, 10)) return false;

      if (photoFilter === 'COMPLETE' && !isComplete) return false;
      if (photoFilter === 'MISSING_ANY' && isComplete) return false;
      if (photoFilter === 'MISSING_WATER' && (hasWaterPhoto || room.waterType === 'flat_per_person')) return false;
      if (photoFilter === 'MISSING_ELEC' && hasElecPhoto) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesRoom = room.roomNo.toLowerCase().includes(q);
        const matchesBuilding = room.buildingName.toLowerCase().includes(q);
        if (!matchesRoom && !matchesBuilding) return false;
      }

      return true;
    });
  }, [items, selectedBuilding, selectedFloor, photoFilter, searchQuery]);

  // Overall photo stats
  const photoStats = useMemo(() => {
    let completeCount = 0;
    let missingWater = 0;
    let missingElec = 0;

    items.forEach(({ room, hasWaterPhoto, hasElecPhoto, isComplete }) => {
      if (isComplete) completeCount++;
      if (!hasWaterPhoto && room.waterType !== 'flat_per_person') missingWater++;
      if (!hasElecPhoto) missingElec++;
    });

    return {
      total: items.length,
      completeCount,
      missingWater,
      missingElec,
      coveragePercent: items.length > 0 ? ((completeCount / items.length) * 100).toFixed(1) : 0,
    };
  }, [items]);

  // Handle Photo File Upload / Camera
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, roomId: string, meterType: 'water' | 'electricity') => {
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
          const timestamp = new Date().toISOString();

          if (meterType === 'water') {
            onUpdateRecord(roomId, {
              waterPhoto: compressed,
              waterPhotoTimestamp: timestamp,
            });
            showToast('อัปโหลดภาพถ่ายมิเตอร์น้ำสำเร็จ');
          } else {
            onUpdateRecord(roomId, {
              elecPhoto: compressed,
              elecPhotoTimestamp: timestamp,
            });
            showToast('อัปโหลดภาพถ่ายมิเตอร์ไฟฟ้าสำเร็จ');
          }
        }
      };
    };
  };

  // AI OCR Reading call
  const handleAiReadMeter = async (roomId: string, meterType: 'water' | 'electricity', photoBase64?: string | null) => {
    if (!photoBase64) {
      showToast('กรุณาถ่ายภาพหรืออัปโหลดรูปมิเตอร์ก่อนใช้ระบบ AI อ่านตัวเลข', 'error');
      return;
    }

    setReadingAiLoadingRoomId(`${roomId}_${meterType}`);
    try {
      const response = await fetch('/api/read-meter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: photoBase64,
          meterType,
        }),
      });

      const resData = await response.json();
      if (resData.success && typeof resData.reading === 'number') {
        const readingNum = resData.reading;
        const currentRec = records[roomId];

        if (meterType === 'water') {
          const prev = currentRec ? currentRec.waterPrev : 0;
          const units = Math.max(0, readingNum - prev);
          const cost = units * (currentRec?.waterType === 'flat_per_person' ? 100 : 20);
          onUpdateRecord(roomId, {
            waterCurr: readingNum,
            waterUnits: units,
            waterCost: cost,
            totalAmount: cost + (currentRec ? currentRec.elecCost : 0),
          });
          showToast(`AI อ่านเลขมิเตอร์น้ำ: ${readingNum} (ความมั่นใจ ${(resData.confidence * 100).toFixed(0)}%)`);
        } else {
          const prev = currentRec ? currentRec.elecPrev : 0;
          const units = Math.max(0, readingNum - prev);
          const cost = units * 6;
          onUpdateRecord(roomId, {
            elecCurr: readingNum,
            elecUnits: units,
            elecCost: cost,
            totalAmount: (currentRec ? currentRec.waterCost : 0) + cost,
          });
          showToast(`AI อ่านเลขมิเตอร์ไฟ: ${readingNum} (ความมั่นใจ ${(resData.confidence * 100).toFixed(0)}%)`);
        }
      } else {
        showToast(resData.message || 'ไม่สามารถอ่านตัวเลขได้ชัดเจน กรุณาตรวจสอบหรือกรอกด้วยตนเอง', 'error');
      }
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ AI OCR: ' + err.message, 'error');
    } finally {
      setReadingAiLoadingRoomId(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-700">Audit & Evidence Gallery</span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500">ประจำเดือน {formatMonthThai(selectedMonth)}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              รายงานรูปภาพหลักฐานมิเตอร์น้ำประปา - มิเตอร์ไฟฟ้า
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ระบบจัดเก็บและตรวจสอบภาพถ่ายมิเตอร์ห้องพัก ตรวจสอบความโปร่งใส ป้องกันข้อพิพาท พร้อมฟังก์ชัน AI สแกนหน้าปัด
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'cards' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                มุมมองการ์ดรูปภาพ
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ตารางเปรียบเทียบ
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์รายงานรูปภาพ (A4)</span>
            </button>
          </div>
        </div>

        {/* Global Progress Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
            <div className="text-slate-500">ห้องพักทั้งหมด</div>
            <div className="text-lg font-bold text-slate-900 mt-0.5 tabular-nums">{photoStats.total} ห้อง</div>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="text-emerald-700">มีรูปครบถ้วน</div>
            <div className="text-lg font-bold text-emerald-800 mt-0.5 tabular-nums">
              {photoStats.completeCount} <span className="text-xs font-normal">({photoStats.coveragePercent}%)</span>
            </div>
          </div>
          <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg">
            <div className="text-sky-700">ขาดรูปมิเตอร์น้ำ</div>
            <div className="text-lg font-bold text-sky-800 mt-0.5 tabular-nums">{photoStats.missingWater} ห้อง</div>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="text-amber-700">ขาดรูปมิเตอร์ไฟ</div>
            <div className="text-lg font-bold text-amber-800 mt-0.5 tabular-nums">{photoStats.missingElec} ห้อง</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        {/* Building Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            เลือกอาคารที่ต้องการดูรูป:
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedBuilding('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedBuilding === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              ทุกอาคาร ({items.length})
            </button>
            {buildings.map((b) => {
              const bRooms = items.filter((i) => i.room.buildingId === b.id);
              const bComplete = bRooms.filter((i) => i.isComplete).length;
              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedBuilding(b.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    selectedBuilding === b.id ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{b.name}</span>
                  <span className="text-[10px] opacity-80 tabular-nums">
                    ({bComplete}/{bRooms.length})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-slate-500 font-medium mb-1">ชั้น:</label>
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="ALL">ทุกชั้น</option>
              <option value="1">ชั้น 1</option>
              <option value="2">ชั้น 2</option>
              <option value="3">ชั้น 3</option>
              <option value="4">ชั้น 4</option>
              <option value="5">ชั้น 5</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">สถานะภาพถ่าย:</label>
            <select
              value={photoFilter}
              onChange={(e) => setPhotoFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="ALL">ทั้งหมด</option>
              <option value="COMPLETE">มีภาพครบทั้งน้ำและไฟ</option>
              <option value="MISSING_ANY">ขาดภาพถ่าย (อย่างใดอย่างหนึ่ง)</option>
              <option value="MISSING_WATER">ขาดภาพมิเตอร์น้ำ</option>
              <option value="MISSING_ELEC">ขาดภาพมิเตอร์ไฟ</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">ค้นหาห้อง:</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาเลขห้อง เช่น 201, 4114..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>
      </div>

      {/* GALLERY VIEW: Cards Mode */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(({ room, rec, hasWaterPhoto, hasElecPhoto, isComplete }) => {
            const isLoadingWater = readingAiLoadingRoomId === `${room.id}_water`;
            const isLoadingElec = readingAiLoadingRoomId === `${room.id}_electricity`;

            return (
              <div
                key={room.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:border-slate-300 transition-all flex flex-col"
              >
                {/* Card Header */}
                <div className="p-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base text-slate-900 tracking-tight">ห้อง {room.roomNo}</span>
                    <span className="text-xs text-slate-500">· {room.buildingName} (ชั้น {room.floor})</span>
                  </div>
                  {isComplete ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      <Check className="w-3 h-3" />
                      <span>รูปครบ</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                      <AlertCircle className="w-3 h-3" />
                      <span>ยังไม่ครบ</span>
                    </span>
                  )}
                </div>

                {/* Meter Photos Container */}
                <div className="p-3.5 grid grid-cols-2 gap-3 flex-1">
                  {/* WATER METER */}
                  <div className="flex flex-col bg-slate-50/70 border border-slate-200/80 rounded-lg p-2.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-sky-800 mb-1.5">
                      <span className="flex items-center gap-1">
                        <Droplets className="w-3.5 h-3.5 text-sky-600" />
                        <span>มิเตอร์น้ำ</span>
                      </span>
                      {room.waterType === 'flat_per_person' && (
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-1 rounded">เหมาคน</span>
                      )}
                    </div>

                    {room.waterType === 'flat_per_person' ? (
                      <div className="h-28 flex flex-col items-center justify-center text-center p-2 text-xs text-slate-500 bg-white border border-dashed border-slate-200 rounded-md">
                        <span className="font-semibold text-slate-700">เหมาจ่ายค่าน้ำ</span>
                        <span className="text-[11px] mt-0.5 text-amber-700 font-medium">
                          {rec ? `${rec.occupants || 1} คน (฿${formatNumber(rec.waterCost)})` : '100 บ./คน'}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="relative group rounded-md overflow-hidden bg-slate-900 h-28 flex items-center justify-center border border-slate-200">
                          {hasWaterPhoto && rec?.waterPhoto ? (
                            <>
                              <img
                                src={rec.waterPhoto}
                                alt={`Water meter room ${room.roomNo}`}
                                className="w-full h-full object-cover"
                              />
                              <div
                                onClick={() =>
                                  setZoomModal({
                                    isOpen: true,
                                    photoUrl: rec.waterPhoto || null,
                                    title: `${room.buildingName} • มิเตอร์น้ำ`,
                                    roomNo: room.roomNo,
                                    meterType: 'water',
                                    currentReading: rec.waterCurr,
                                    timestamp: rec.waterPhotoTimestamp,
                                    roomId: room.id,
                                  })
                                }
                                className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer"
                              >
                                <ZoomIn className="w-5 h-5 mb-1" />
                                <span className="text-[10px] font-medium">กดดูภาพขยาย</span>
                              </div>
                            </>
                          ) : (
                            <div className="text-center p-2 text-slate-400 text-xs">
                              <Image className="w-6 h-6 mx-auto mb-1 opacity-40" />
                              <span>ยังไม่มีภาพ</span>
                            </div>
                          )}
                        </div>

                        {/* Readings info */}
                        <div className="mt-2 text-[11px] space-y-0.5 text-slate-600">
                          <div className="flex justify-between">
                            <span className="text-slate-400">เลขตั้งต้น:</span>
                            <span className="tabular-nums font-mono">{rec ? rec.waterPrev : '-'}</span>
                          </div>
                          <div className="flex justify-between font-semibold text-slate-800">
                            <span>เลขจดใหม่:</span>
                            <span className="tabular-nums font-mono text-sky-700">{rec ? rec.waterCurr : '-'}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-slate-200/60 font-bold text-sky-800">
                            <span>ใช้: {rec ? rec.waterUnits : 0} หน่วย</span>
                            <span>฿{formatNumber(rec?.waterCost || 0)}</span>
                          </div>
                        </div>

                        {/* Actions: Camera & AI */}
                        <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center gap-1.5">
                          <label className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-[10px] font-medium text-slate-700 cursor-pointer transition-colors">
                            <Camera className="w-3 h-3 text-slate-500" />
                            <span>{hasWaterPhoto ? 'ถ่ายใหม่' : 'ถ่ายรูป'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={(e) => handlePhotoUpload(e, room.id, 'water')}
                            />
                          </label>

                          <button
                            disabled={!hasWaterPhoto || isLoadingWater}
                            onClick={() => handleAiReadMeter(room.id, 'water', rec?.waterPhoto)}
                            title="ใช้ AI ตรวจสอบและอ่านตัวเลขจากรูปมิเตอร์น้ำ"
                            className="flex items-center justify-center gap-1 px-2 py-1 rounded bg-sky-50 hover:bg-sky-100 border border-sky-200 text-[10px] font-semibold text-sky-800 disabled:opacity-40 transition-colors"
                          >
                            <Sparkles className={`w-3 h-3 text-sky-600 ${isLoadingWater ? 'animate-spin' : ''}`} />
                            <span>{isLoadingWater ? 'AI กำลังอ่าน...' : 'AI อ่าน'}</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* ELECTRICITY METER */}
                  <div className="flex flex-col bg-slate-50/70 border border-slate-200/80 rounded-lg p-2.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-amber-800 mb-1.5">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-600" />
                        <span>มิเตอร์ไฟฟ้า</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">6 บ./หน่วย</span>
                    </div>

                    <div className="relative group rounded-md overflow-hidden bg-slate-900 h-28 flex items-center justify-center border border-slate-200">
                      {hasElecPhoto && rec?.elecPhoto ? (
                        <>
                          <img
                            src={rec.elecPhoto}
                            alt={`Electricity meter room ${room.roomNo}`}
                            className="w-full h-full object-cover"
                          />
                          <div
                            onClick={() =>
                              setZoomModal({
                                isOpen: true,
                                photoUrl: rec.elecPhoto || null,
                                title: `${room.buildingName} • มิเตอร์ไฟฟ้า`,
                                roomNo: room.roomNo,
                                meterType: 'electricity',
                                currentReading: rec.elecCurr,
                                timestamp: rec.elecPhotoTimestamp,
                                roomId: room.id,
                              })
                            }
                            className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer"
                          >
                            <ZoomIn className="w-5 h-5 mb-1" />
                            <span className="text-[10px] font-medium">กดดูภาพขยาย</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-2 text-slate-400 text-xs">
                          <Image className="w-6 h-6 mx-auto mb-1 opacity-40" />
                          <span>ยังไม่มีภาพ</span>
                        </div>
                      )}
                    </div>

                    {/* Readings info */}
                    <div className="mt-2 text-[11px] space-y-0.5 text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-400">เลขตั้งต้น:</span>
                        <span className="tabular-nums font-mono">{rec ? rec.elecPrev : '-'}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-slate-800">
                        <span>เลขจดใหม่:</span>
                        <span className="tabular-nums font-mono text-amber-700">{rec ? rec.elecCurr : '-'}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200/60 font-bold text-amber-800">
                        <span>ใช้: {rec ? rec.elecUnits : 0} หน่วย</span>
                        <span>฿{formatNumber(rec?.elecCost || 0)}</span>
                      </div>
                    </div>

                    {/* Actions: Camera & AI */}
                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center gap-1.5">
                      <label className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-[10px] font-medium text-slate-700 cursor-pointer transition-colors">
                        <Camera className="w-3 h-3 text-slate-500" />
                        <span>{hasElecPhoto ? 'ถ่ายใหม่' : 'ถ่ายรูป'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => handlePhotoUpload(e, room.id, 'electricity')}
                        />
                      </label>

                      <button
                        disabled={!hasElecPhoto || isLoadingElec}
                        onClick={() => handleAiReadMeter(room.id, 'electricity', rec?.elecPhoto)}
                        title="ใช้ AI ตรวจสอบและอ่านตัวเลขจากรูปมิเตอร์ไฟฟ้า"
                        className="flex items-center justify-center gap-1 px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200 text-[10px] font-semibold text-amber-800 disabled:opacity-40 transition-colors"
                      >
                        <Sparkles className={`w-3 h-3 text-amber-600 ${isLoadingElec ? 'animate-spin' : ''}`} />
                        <span>{isLoadingElec ? 'AI กำลังอ่าน...' : 'AI อ่าน'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  <div className="text-slate-500 truncate max-w-[150px]">
                    {rec?.remark ? (
                      <span className="font-medium text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded text-[10px]">
                        {rec.remark}
                      </span>
                    ) : (
                      <span>ไม่มีหมายเหตุ</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">รวมทั้งสิ้น:</span>
                    <span className="font-black text-slate-900 text-sm tabular-nums">
                      ฿{formatNumber(rec?.totalAmount || 0)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 w-16">ห้อง</th>
                  <th className="p-3">อาคาร</th>
                  <th className="p-3 text-center">ภาพมิเตอร์น้ำ</th>
                  <th className="p-3">เลขน้ำ (เดิม ➔ ใหม่)</th>
                  <th className="p-3 text-right">ค่าน้ำ (บาท)</th>
                  <th className="p-3 text-center">ภาพมิเตอร์ไฟ</th>
                  <th className="p-3">เลขไฟ (เดิม ➔ ใหม่)</th>
                  <th className="p-3 text-right">ค่าไฟ (บาท)</th>
                  <th className="p-3 text-right">รวมเงิน (บาท)</th>
                  <th className="p-3">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredItems.map(({ room, rec, hasWaterPhoto, hasElecPhoto }) => (
                  <tr key={room.id} className="hover:bg-slate-50/80">
                    <td className="p-3 font-bold text-slate-900">{room.roomNo}</td>
                    <td className="p-3">{room.buildingName}</td>

                    {/* Water photo thumb */}
                    <td className="p-3 text-center">
                      {hasWaterPhoto && rec?.waterPhoto ? (
                        <img
                          src={rec.waterPhoto}
                          alt="water"
                          onClick={() =>
                            setZoomModal({
                              isOpen: true,
                              photoUrl: rec.waterPhoto || null,
                              title: `${room.buildingName} • มิเตอร์น้ำ`,
                              roomNo: room.roomNo,
                              meterType: 'water',
                              currentReading: rec.waterCurr,
                              timestamp: rec.waterPhotoTimestamp,
                              roomId: room.id,
                            })
                          }
                          className="w-12 h-10 object-cover rounded border border-slate-300 inline-block cursor-pointer hover:opacity-80"
                        />
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          {room.waterType === 'flat_per_person' ? 'เหมาคน' : 'ไม่มีรูป'}
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono">
                      {room.waterType === 'flat_per_person'
                        ? `เหมา ${rec?.occupants || 1} คน`
                        : `${rec?.waterPrev || 0} ➔ ${rec?.waterCurr || 0} (${rec?.waterUnits || 0} หน่วย)`}
                    </td>
                    <td className="p-3 text-right font-medium text-sky-800">
                      ฿{formatNumber(rec?.waterCost || 0)}
                    </td>

                    {/* Elec photo thumb */}
                    <td className="p-3 text-center">
                      {hasElecPhoto && rec?.elecPhoto ? (
                        <img
                          src={rec.elecPhoto}
                          alt="elec"
                          onClick={() =>
                            setZoomModal({
                              isOpen: true,
                              photoUrl: rec.elecPhoto || null,
                              title: `${room.buildingName} • มิเตอร์ไฟฟ้า`,
                              roomNo: room.roomNo,
                              meterType: 'electricity',
                              currentReading: rec.elecCurr,
                              timestamp: rec.elecPhotoTimestamp,
                              roomId: room.id,
                            })
                          }
                          className="w-12 h-10 object-cover rounded border border-slate-300 inline-block cursor-pointer hover:opacity-80"
                        />
                      ) : (
                        <span className="text-[10px] text-slate-400">ไม่มีรูป</span>
                      )}
                    </td>
                    <td className="p-3 font-mono">
                      {rec?.elecPrev || 0} ➔ {rec?.elecCurr || 0} ({rec?.elecUnits || 0} หน่วย)
                    </td>
                    <td className="p-3 text-right font-medium text-amber-800">
                      ฿{formatNumber(rec?.elecCost || 0)}
                    </td>

                    <td className="p-3 text-right font-bold text-slate-900">
                      ฿{formatNumber(rec?.totalAmount || 0)}
                    </td>
                    <td className="p-3 text-[11px] text-slate-500">{rec?.remark || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Image className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-800">ไม่พบรูปภาพตามเงื่อนไขที่เลือก</h4>
          <p className="text-xs text-slate-500 mt-1">กรุณาลองเปลี่ยนอาคารหรือคำค้นหา</p>
        </div>
      )}

      {/* Zoom Inspector Lightbox */}
      <PhotoZoomModal
        isOpen={zoomModal.isOpen}
        onClose={() => setZoomModal((prev) => ({ ...prev, isOpen: false }))}
        photoUrl={zoomModal.photoUrl}
        title={zoomModal.title}
        roomNo={zoomModal.roomNo}
        meterType={zoomModal.meterType}
        currentReading={zoomModal.currentReading}
        timestamp={zoomModal.timestamp}
        onConfirmReading={(reading) => {
          if (zoomModal.roomId) {
            const currentRec = records[zoomModal.roomId];
            if (zoomModal.meterType === 'water') {
              const prev = currentRec ? currentRec.waterPrev : 0;
              const units = Math.max(0, reading - prev);
              const cost = units * (currentRec?.waterType === 'flat_per_person' ? 100 : 20);
              onUpdateRecord(zoomModal.roomId, {
                waterCurr: reading,
                waterUnits: units,
                waterCost: cost,
                totalAmount: cost + (currentRec ? currentRec.elecCost : 0),
              });
              showToast(`อัปเดตเลขมิเตอร์น้ำห้อง ${zoomModal.roomNo}: ${reading}`);
            } else {
              const prev = currentRec ? currentRec.elecPrev : 0;
              const units = Math.max(0, reading - prev);
              const cost = units * 6;
              onUpdateRecord(zoomModal.roomId, {
                elecCurr: reading,
                elecUnits: units,
                elecCost: cost,
                totalAmount: (currentRec ? currentRec.waterCost : 0) + cost,
              });
              showToast(`อัปเดตเลขมิเตอร์ไฟห้อง ${zoomModal.roomNo}: ${reading}`);
            }
          }
        }}
      />

      {/* PRINT-ONLY AUDIT SHEET: Formatted specifically for A4 print */}
      <div className="print-only">
        <div className="text-center pb-3 border-b-2 border-slate-900 mb-4">
          <h1 className="text-lg font-black tracking-wide">รายงานรูปภาพหลักฐานการจดมิเตอร์น้ำประปา - มิเตอร์ไฟฟ้า</h1>
          <p className="text-xs text-slate-700">
            {selectedBuilding === 'ALL' ? 'ทุกอาคารที่พักอาศัย' : `หอพัก${buildings.find((b) => b.id === selectedBuilding)?.name}`} · ประจำเดือน {formatMonthThai(selectedMonth)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {filteredItems.slice(0, 30).map(({ room, rec, hasWaterPhoto, hasElecPhoto }) => (
            <div key={room.id} className="border border-slate-400 p-2 rounded page-break">
              <div className="flex justify-between items-center text-xs font-bold border-b border-slate-300 pb-1 mb-2">
                <span>{room.buildingName} • ห้อง {room.roomNo}</span>
                <span>รวม: ฿{formatNumber(rec?.totalAmount || 0)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {/* Water */}
                <div className="border border-slate-300 p-1 rounded text-center">
                  <div className="font-bold text-sky-900 mb-1">มิเตอร์น้ำ ({rec?.waterUnits || 0} หน่วย)</div>
                  {hasWaterPhoto && rec?.waterPhoto ? (
                    <img src={rec.waterPhoto} alt="water" className="w-full h-24 object-cover rounded" />
                  ) : (
                    <div className="h-24 flex items-center justify-center bg-slate-100 text-slate-400">
                      {room.waterType === 'flat_per_person' ? 'เหมาจ่าย' : 'ไม่มีรูป'}
                    </div>
                  )}
                  <div className="mt-1 font-mono">{rec?.waterPrev} ➔ {rec?.waterCurr} (฿{formatNumber(rec?.waterCost || 0)})</div>
                </div>

                {/* Elec */}
                <div className="border border-slate-300 p-1 rounded text-center">
                  <div className="font-bold text-amber-900 mb-1">มิเตอร์ไฟ ({rec?.elecUnits || 0} หน่วย)</div>
                  {hasElecPhoto && rec?.elecPhoto ? (
                    <img src={rec.elecPhoto} alt="elec" className="w-full h-24 object-cover rounded" />
                  ) : (
                    <div className="h-24 flex items-center justify-center bg-slate-100 text-slate-400">
                      ไม่มีรูป
                    </div>
                  )}
                  <div className="mt-1 font-mono">{rec?.elecPrev} ➔ {rec?.elecCurr} (฿{formatNumber(rec?.elecCost || 0)})</div>
                </div>
              </div>
              {rec?.remark && (
                <div className="text-[9px] text-slate-600 mt-1 italic">หมายเหตุ: {rec.remark}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
