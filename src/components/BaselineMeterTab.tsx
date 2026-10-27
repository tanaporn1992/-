import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  Printer,
  Search,
  Check,
  AlertTriangle,
  Info,
  Save,
  ArrowRight,
  ClipboardPaste,
  Droplets,
  Zap,
  Sliders,
  X,
  FileCheck2,
} from 'lucide-react';
import { RoomDefinition, MeterRecord, BuildingConfig } from '../types';
import {
  formatNumber,
  formatMonthThai,
  getShortMonthYear,
  getPrevShortMonthYear,
  seedSeptember2026Data,
} from '../data/dormData';

interface BaselineMeterTabProps {
  masterRooms: RoomDefinition[];
  records: Record<string, MeterRecord>;
  previousMonthRecords: Record<string, MeterRecord>;
  selectedMonth: string;
  buildings: BuildingConfig[];
  onUpdateRecord: (roomId: string, partial: Partial<MeterRecord>) => void;
  onBatchUpdateRecords: (updatedRecords: Record<string, MeterRecord>) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const BaselineMeterTab: React.FC<BaselineMeterTabProps> = ({
  masterRooms,
  records,
  previousMonthRecords,
  selectedMonth,
  buildings,
  onUpdateRecord,
  onBatchUpdateRecords,
  showToast,
}) => {
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(buildings[0]?.id || 'thachana');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'ALL' | 'ANOMALY' | 'NO_CURRENT' | 'MODIFIED'>('ALL');
  
  // Local edit staging so user can edit multiple rooms or save inline
  const [editValues, setEditValues] = useState<Record<string, { waterPrev: number; elecPrev: number }>>({});
  const [modifiedRoomIds, setModifiedRoomIds] = useState<Set<string>>(new Set());

  // Batch paste modal state
  const [isBatchModalOpen, setIsBatchModalOpen] = useState<boolean>(false);
  const [batchText, setBatchText] = useState<string>('');
  const [batchTargetBuilding, setBatchTargetBuilding] = useState<string>(buildings[0]?.id || 'thachana');

  // Confirmation modal for roll-forward
  const [confirmRollForward, setConfirmRollForward] = useState<{
    isOpen: boolean;
    scope: 'building' | 'all';
  }>({ isOpen: false, scope: 'building' });

  const activeBuilding = buildings.find((b) => b.id === selectedBuildingId) || buildings[0];

  // Filter master rooms for the active building
  const buildingRooms = useMemo(() => {
    return masterRooms.filter((r) => r.buildingId === selectedBuildingId);
  }, [masterRooms, selectedBuildingId]);

  // Combined room data with baseline numbers
  const displayRows = useMemo(() => {
    return buildingRooms
      .filter((room) => {
        if (!searchQuery) return true;
        return room.roomNo.toLowerCase().includes(searchQuery.toLowerCase().trim());
      })
      .map((room) => {
        const rec = records[room.id];
        const prevRec = previousMonthRecords[room.id];
        
        // Base values from edit staging or record or previous record
        const staged = editValues[room.id];
        const waterPrev = staged !== undefined ? staged.waterPrev : (rec?.waterPrev ?? prevRec?.waterCurr ?? 0);
        const elecPrev = staged !== undefined ? staged.elecPrev : (rec?.elecPrev ?? prevRec?.elecCurr ?? 0);

        const waterCurr = rec?.waterCurr ?? waterPrev;
        const elecCurr = rec?.elecCurr ?? elecPrev;

        const isFlatWater = room.waterType === 'flat_per_person';
        const waterUnits = isFlatWater ? 0 : Math.max(0, waterCurr - waterPrev);
        const elecUnits = Math.max(0, elecCurr - elecPrev);

        // Anomaly checks (e.g. baseline > current reading, or very high baseline)
        const isWaterAnomaly = !isFlatWater && waterCurr < waterPrev && rec !== undefined;
        const isElecAnomaly = elecCurr < elecPrev && rec !== undefined;
        const isModified = modifiedRoomIds.has(room.id);
        const hasRecordedCurrent = !!rec && (rec.waterCurr > 0 || rec.elecCurr > 0);

        return {
          room,
          rec,
          prevRec,
          waterPrev,
          waterCurr,
          elecPrev,
          elecCurr,
          waterUnits,
          elecUnits,
          isFlatWater,
          isWaterAnomaly,
          isElecAnomaly,
          isModified,
          hasRecordedCurrent,
        };
      })
      .filter((row) => {
        if (filterType === 'ANOMALY') return row.isWaterAnomaly || row.isElecAnomaly;
        if (filterType === 'NO_CURRENT') return !row.hasRecordedCurrent;
        if (filterType === 'MODIFIED') return row.isModified;
        return true;
      });
  }, [buildingRooms, searchQuery, records, previousMonthRecords, editValues, modifiedRoomIds, filterType]);

  // Overall building statistics
  const stats = useMemo(() => {
    const total = buildingRooms.length;
    let anomalyCount = 0;
    let modifiedCount = 0;
    let noCurrentCount = 0;

    buildingRooms.forEach((room) => {
      const rec = records[room.id];
      const prev = previousMonthRecords[room.id];
      const wPrev = editValues[room.id]?.waterPrev ?? rec?.waterPrev ?? prev?.waterCurr ?? 0;
      const ePrev = editValues[room.id]?.elecPrev ?? rec?.elecPrev ?? prev?.elecCurr ?? 0;
      const wCurr = rec?.waterCurr ?? wPrev;
      const eCurr = rec?.elecCurr ?? ePrev;

      if (room.waterType !== 'flat_per_person' && wCurr < wPrev && rec) anomalyCount++;
      if (eCurr < ePrev && rec) anomalyCount++;
      if (modifiedRoomIds.has(room.id)) modifiedCount++;
      if (!rec || (rec.waterCurr === 0 && rec.elecCurr === 0)) noCurrentCount++;
    });

    return { total, anomalyCount, modifiedCount, noCurrentCount };
  }, [buildingRooms, records, previousMonthRecords, editValues, modifiedRoomIds]);

  // Handle inline change
  const handleInputChange = (roomId: string, field: 'waterPrev' | 'elecPrev', val: number) => {
    const currentStaged = editValues[roomId] || {
      waterPrev: records[roomId]?.waterPrev ?? 0,
      elecPrev: records[roomId]?.elecPrev ?? 0,
    };

    setEditValues((prev) => ({
      ...prev,
      [roomId]: {
        ...currentStaged,
        [field]: val,
      },
    }));

    setModifiedRoomIds((prev) => new Set(prev).add(roomId));
  };

  // Save single room baseline
  const handleSaveSingle = (room: RoomDefinition) => {
    const staged = editValues[room.id];
    if (!staged) return;

    onUpdateRecord(room.id, {
      waterPrev: staged.waterPrev,
      elecPrev: staged.elecPrev,
    });

    // Remove from modified set
    setModifiedRoomIds((prev) => {
      const next = new Set(prev);
      next.delete(room.id);
      return next;
    });

    showToast(`บันทึกเลขตั้งต้น ห้อง ${room.roomNo} เรียบร้อยแล้ว`);
  };

  // Save all modified baselines for the current building
  const handleSaveAllModified = () => {
    const updatedMap: Record<string, MeterRecord> = {};
    const timestamp = new Date().toISOString();

    modifiedRoomIds.forEach((roomId) => {
      const staged = editValues[roomId];
      const room = masterRooms.find((r) => r.id === roomId);
      if (!staged || !room) return;

      const existing = records[roomId];
      const isFlatWater = room.waterType === 'flat_per_person';
      const occupants = existing?.occupants || 1;

      const waterPrev = staged.waterPrev;
      const waterCurr = existing ? Math.max(existing.waterCurr, waterPrev) : waterPrev;
      const waterUnits = isFlatWater ? 0 : Math.max(0, waterCurr - waterPrev);
      const waterCost = isFlatWater ? occupants * 100 : waterUnits * 20;

      const elecPrev = staged.elecPrev;
      const elecCurr = existing ? Math.max(existing.elecCurr, elecPrev) : elecPrev;
      const elecUnits = Math.max(0, elecCurr - elecPrev);
      const elecCost = elecUnits * 6;
      const totalAmount = waterCost + elecCost;

      updatedMap[roomId] = {
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
        waterPhoto: existing?.waterPhoto || null,
        waterPhotoTimestamp: existing?.waterPhotoTimestamp || null,
        elecPrev,
        elecCurr,
        elecUnits,
        elecCost,
        elecPhoto: existing?.elecPhoto || null,
        elecPhotoTimestamp: existing?.elecPhotoTimestamp || null,
        remark: existing?.remark || '',
        totalAmount,
        recordedAt: existing?.recordedAt || timestamp,
        verified: existing?.verified ?? true,
      };
    });

    if (Object.keys(updatedMap).length > 0) {
      onBatchUpdateRecords(updatedMap);
      setModifiedRoomIds(new Set());
      setEditValues({});
      showToast(`บันทึกเลขตั้งต้นสำเร็จ ${Object.keys(updatedMap).length} ห้อง`);
    } else {
      showToast('ไม่มีรายการแก้ไขที่ต้องบันทึก', 'error');
    }
  };

  // Roll forward previous month's final reading as new baseline
  const handleRollForwardExecute = () => {
    const targetRooms = confirmRollForward.scope === 'building' ? buildingRooms : masterRooms;
    const updatedMap: Record<string, MeterRecord> = {};
    const timestamp = new Date().toISOString();
    let updatedCount = 0;

    targetRooms.forEach((room) => {
      const prevRec = previousMonthRecords[room.id];
      const existing = records[room.id];

      // If prior month had readings, roll forward waterCurr -> waterPrev & elecCurr -> elecPrev
      if (prevRec && (prevRec.waterCurr > 0 || prevRec.elecCurr > 0)) {
        const isFlatWater = room.waterType === 'flat_per_person';
        const occupants = existing?.occupants || prevRec.occupants || 1;

        const newWaterPrev = isFlatWater ? 0 : prevRec.waterCurr;
        const newElecPrev = prevRec.elecCurr;

        const waterCurr = existing?.waterCurr !== undefined && existing.waterCurr >= newWaterPrev ? existing.waterCurr : newWaterPrev;
        const elecCurr = existing?.elecCurr !== undefined && existing.elecCurr >= newElecPrev ? existing.elecCurr : newElecPrev;

        const waterUnits = isFlatWater ? 0 : Math.max(0, waterCurr - newWaterPrev);
        const waterCost = isFlatWater ? occupants * 100 : waterUnits * 20;

        const elecUnits = Math.max(0, elecCurr - newElecPrev);
        const elecCost = elecUnits * 6;
        const totalAmount = waterCost + elecCost;

        updatedMap[room.id] = {
          roomId: room.id,
          buildingId: room.buildingId,
          buildingName: room.buildingName,
          roomNo: room.roomNo,
          floor: room.floor,
          waterType: room.waterType,
          waterPrev: newWaterPrev,
          waterCurr,
          occupants,
          waterUnits,
          waterCost,
          waterPhoto: existing?.waterPhoto || null,
          waterPhotoTimestamp: existing?.waterPhotoTimestamp || null,
          elecPrev: newElecPrev,
          elecCurr,
          elecUnits,
          elecCost,
          elecPhoto: existing?.elecPhoto || null,
          elecPhotoTimestamp: existing?.elecPhotoTimestamp || null,
          remark: existing?.remark || '',
          totalAmount,
          recordedAt: existing?.recordedAt || timestamp,
          verified: existing?.verified ?? true,
        };
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      onBatchUpdateRecords(updatedMap);
      setEditValues({});
      setModifiedRoomIds(new Set());
      setConfirmRollForward({ isOpen: false, scope: 'building' });
      showToast(`ยกยอดเลขมิเตอร์จากเดือนก่อนหน้ามาเป็นเลขตั้งต้นสำเร็จ ${updatedCount} ห้อง`);
    } else {
      setConfirmRollForward({ isOpen: false, scope: 'building' });
      showToast('ไม่พบข้อมูลมิเตอร์เดือนก่อนหน้าสำหรับการยกยอด', 'error');
    }
  };

  // Restore Official PDF Initial Values (ส.ค. 69)
  const handleResetToOfficialPdf = () => {
    if (!window.confirm('คุณต้องการรีเซ็ตเลขตั้งต้นของหอพักนี้ให้ตรงตามเอกสารสิงหาคม 2569 (Official PDF) หรือไม่?')) {
      return;
    }

    const officialSeed = seedSeptember2026Data();
    const updatedMap: Record<string, MeterRecord> = {};

    buildingRooms.forEach((room) => {
      const officialRec = officialSeed[room.id];
      if (officialRec) {
        updatedMap[room.id] = officialRec;
      }
    });

    onBatchUpdateRecords(updatedMap);
    setEditValues({});
    setModifiedRoomIds(new Set());
    showToast(`คืนค่าเลขตั้งต้นตามเอกสารราชการสำเร็จ (${activeBuilding.name})`);
  };

  // Process Batch Paste: rows with [RoomNo, WaterPrev, ElecPrev]
  const handleProcessBatchPaste = () => {
    if (!batchText.trim()) {
      showToast('กรุณากรอกหรือวางข้อความข้อมูลเลขตั้งต้น', 'error');
      return;
    }

    const lines = batchText.trim().split('\n');
    const updatedMap: Record<string, MeterRecord> = {};
    let successCount = 0;
    const timestamp = new Date().toISOString();

    const targetBuildingRooms = masterRooms.filter((r) => r.buildingId === batchTargetBuilding);
    const roomMap = new Map(targetBuildingRooms.map((r) => [r.roomNo.toLowerCase(), r]));

    lines.forEach((line) => {
      // Split by tab, comma, or multiple spaces
      const parts = line.split(/[\t,;]+/).map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const roomNo = parts[0].replace(/[^0-9a-zA-Z/]/g, '').toLowerCase();
        const roomDef = roomMap.get(roomNo);

        if (roomDef) {
          const wPrev = parseFloat(parts[1]) || 0;
          const ePrev = parts[2] !== undefined ? parseFloat(parts[2]) || 0 : (records[roomDef.id]?.elecPrev ?? 0);

          const existing = records[roomDef.id];
          const isFlatWater = roomDef.waterType === 'flat_per_person';
          const occupants = existing?.occupants || 1;

          const waterCurr = existing ? Math.max(existing.waterCurr, wPrev) : wPrev;
          const elecCurr = existing ? Math.max(existing.elecCurr, ePrev) : ePrev;

          const waterUnits = isFlatWater ? 0 : Math.max(0, waterCurr - wPrev);
          const waterCost = isFlatWater ? occupants * 100 : waterUnits * 20;

          const elecUnits = Math.max(0, elecCurr - ePrev);
          const elecCost = elecUnits * 6;
          const totalAmount = waterCost + elecCost;

          updatedMap[roomDef.id] = {
            roomId: roomDef.id,
            buildingId: roomDef.buildingId,
            buildingName: roomDef.buildingName,
            roomNo: roomDef.roomNo,
            floor: roomDef.floor,
            waterType: roomDef.waterType,
            waterPrev: wPrev,
            waterCurr,
            occupants,
            waterUnits,
            waterCost,
            waterPhoto: existing?.waterPhoto || null,
            waterPhotoTimestamp: existing?.waterPhotoTimestamp || null,
            elecPrev: ePrev,
            elecCurr,
            elecUnits,
            elecCost,
            elecPhoto: existing?.elecPhoto || null,
            elecPhotoTimestamp: existing?.elecPhotoTimestamp || null,
            remark: existing?.remark || '',
            totalAmount,
            recordedAt: existing?.recordedAt || timestamp,
            verified: true,
          };
          successCount++;
        }
      }
    });

    if (successCount > 0) {
      onBatchUpdateRecords(updatedMap);
      setIsBatchModalOpen(false);
      setBatchText('');
      showToast(`นำเข้าเลขตั้งต้นสำเร็จ ${successCount} ห้อง`);
    } else {
      showToast('ไม่สามารถจับคู่เลขห้องกับข้อมูลที่วางได้ กรุณาตรวจลำดับคอลัมน์ [เลขห้อง, เลขน้ำ, เลขไฟ]', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Heading */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60">
                <Sliders className="w-3.5 h-3.5 text-amber-600" />
                <span>Meter Baseline & Initial Readings</span>
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500 font-medium">รอบบัญชี {formatMonthThai(selectedMonth)}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              ระบบจัดการเลขตั้งต้นมิเตอร์ (เลขยกมา)
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              เลขตั้งต้นคือตัวเลขอ้างอิงเริ่มต้นสำหรับคำนวณหน่วยน้ำประปาและไฟฟ้าในแต่ละงวด 
              (หน่วยที่ใช้ = เลขจดใหม่ − เลขตั้งต้น) สามารถตรวจสอบ แก้ไขเลขตั้งต้นรายห้อง หรือยกยอดจากเดือนก่อนหน้าได้ทันที
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setConfirmRollForward({ isOpen: true, scope: 'building' })}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-colors shadow-xs"
              title="คัดลอกเลขมิเตอร์สิ้นเดือนก่อนหน้ามาเป็นเลขตั้งต้นเดือนนี้"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ยกยอดจากเดือนก่อน</span>
            </button>

            <button
              onClick={() => setIsBatchModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors border border-slate-200"
              title="วางข้อมูลหลายห้องพร้อมกันจาก Excel"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-slate-600" />
              <span>วางข้อมูลแบบชุด (Excel)</span>
            </button>

            <button
              onClick={handleResetToOfficialPdf}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 font-medium text-xs transition-colors border border-slate-200"
              title="คืนค่าเลขตั้งต้นตามเอกสารต้นฉบับ ส.ค. 69"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-slate-500" />
              <span>คืนค่าตาม PDF ทางการ</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์ใบตั้งต้น</span>
            </button>
          </div>
        </div>

        {/* Building Selector Strip */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            เลือกอาคารที่ต้องการจัดการ:
          </label>
          <div className="flex flex-wrap gap-2">
            {buildings.map((b) => {
              const bRooms = masterRooms.filter((r) => r.buildingId === b.id);
              const isSelected = selectedBuildingId === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => {
                    setSelectedBuildingId(b.id);
                    setBatchTargetBuilding(b.id);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/10'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                  }`}
                >
                  <span>{b.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-slate-800 text-sky-300' : 'bg-slate-200 text-slate-600'}`}>
                    {bRooms.length} ห้อง
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Stats Pill Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
            <span className="block text-[11px] text-slate-500 font-medium">ห้องทั้งหมดในอาคารนี้</span>
            <span className="text-lg font-black text-slate-900 tabular-nums">{stats.total} ห้อง</span>
          </div>

          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60">
            <span className="block text-[11px] text-amber-700 font-medium">รอบเลขตั้งต้นอ้างอิง</span>
            <span className="text-base font-black text-amber-900">
              {getPrevShortMonthYear(selectedMonth)} (เลขยกมา)
            </span>
          </div>

          <div className="p-3 bg-sky-50/60 rounded-xl border border-sky-200/60">
            <span className="block text-[11px] text-sky-700 font-medium">รอบจดมิเตอร์ปัจจุบัน</span>
            <span className="text-base font-black text-sky-900">
              {getShortMonthYear(selectedMonth)} (งวดนี้)
            </span>
          </div>

          <div className={`p-3 rounded-xl border ${stats.anomalyCount > 0 ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
            <span className="block text-[11px] font-medium">
              {stats.anomalyCount > 0 ? 'แจ้งเตือนมิเตอร์ถอยหลัง' : 'ความสมบูรณ์ของข้อมูล'}
            </span>
            <span className="text-base font-black tabular-nums">
              {stats.anomalyCount > 0 ? `${stats.anomalyCount} ห้องต้องตรวจสอบ` : 'ตัวเลขสัมพันธ์ถูกต้อง'}
            </span>
          </div>
        </div>
      </div>

      {/* Table & Controls Section */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="ค้นหาเลขห้อง (เช่น 101, 204)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  filterType === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ทั้งหมด ({buildingRooms.length})
              </button>
              <button
                onClick={() => setFilterType('MODIFIED')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  filterType === 'MODIFIED' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                แก้ไขแล้ว ({modifiedRoomIds.size})
              </button>
              {stats.anomalyCount > 0 && (
                <button
                  onClick={() => setFilterType('ANOMALY')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                    filterType === 'ANOMALY' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>ผิดปกติ ({stats.anomalyCount})</span>
                </button>
              )}
            </div>
          </div>

          {/* Staged Save button */}
          {modifiedRoomIds.size > 0 && (
            <button
              onClick={handleSaveAllModified}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm animate-pulse"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการแก้ไขเลขตั้งต้นทั้งหมด ({modifiedRoomIds.size} ห้อง)</span>
            </button>
          )}
        </div>

        {/* The Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
              <tr>
                <th rowSpan={2} className="p-3 border border-slate-300 w-20 bg-slate-200/60">
                  ห้องพัก
                </th>
                <th rowSpan={2} className="p-3 border border-slate-300 w-24">
                  ชั้น / อาคาร
                </th>
                <th colSpan={3} className="p-2 border border-slate-300 bg-sky-50 text-sky-900">
                  <span className="flex items-center justify-center gap-1.5">
                    <Droplets className="w-4 h-4 text-sky-600" />
                    <span>มิเตอร์น้ำประปา</span>
                  </span>
                </th>
                <th colSpan={3} className="p-2 border border-slate-300 bg-amber-50 text-amber-900">
                  <span className="flex items-center justify-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <span>มิเตอร์ไฟฟ้า</span>
                  </span>
                </th>
                <th rowSpan={2} className="p-3 border border-slate-300 w-28 bg-emerald-50 text-emerald-900">
                  ยอดรวมประเมิน (บาท)
                </th>
                <th rowSpan={2} className="p-3 border border-slate-300 w-24">
                  การจัดการ
                </th>
              </tr>
              <tr>
                {/* Water sub-headers */}
                <th className="p-2 border border-slate-300 bg-amber-100/60 text-amber-950 font-black w-28">
                  เลขตั้งต้น (ส.ค. 69)
                </th>
                <th className="p-2 border border-slate-300 bg-sky-100/50 text-slate-700 w-24">
                  เลขจดใหม่ (ก.ย. 69)
                </th>
                <th className="p-2 border border-slate-300 bg-sky-50 text-slate-700 w-20">
                  หน่วยใช้
                </th>

                {/* Elec sub-headers */}
                <th className="p-2 border border-slate-300 bg-amber-100/60 text-amber-950 font-black w-28">
                  เลขตั้งต้น (ส.ค. 69)
                </th>
                <th className="p-2 border border-slate-300 bg-amber-100/50 text-slate-700 w-24">
                  เลขจดใหม่ (ก.ย. 69)
                </th>
                <th className="p-2 border border-slate-300 bg-amber-50 text-slate-700 w-20">
                  หน่วยใช้
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {displayRows.map((row) => {
                const isDirty = row.isModified;
                return (
                  <tr
                    key={row.room.id}
                    className={`transition-colors ${
                      row.isWaterAnomaly || row.isElecAnomaly
                        ? 'bg-rose-50/60 hover:bg-rose-50'
                        : isDirty
                        ? 'bg-amber-50/50 hover:bg-amber-50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Room No */}
                    <td className="p-2.5 font-bold text-slate-900 border border-slate-200 bg-slate-50/70">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="font-mono text-sm">{row.room.roomNo}</span>
                        {isDirty && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="มีการปรับปรุงเลขตั้งต้น" />
                        )}
                      </div>
                    </td>

                    {/* Floor / Building */}
                    <td className="p-2 border border-slate-200 text-slate-500 text-[11px]">
                      ชั้น {row.room.floor}
                    </td>

                    {/* WATER: Starting / Baseline input */}
                    <td className="p-2 border border-slate-200 bg-amber-50/30">
                      {row.isFlatWater ? (
                        <span className="text-slate-400 font-mono text-[11px]">
                          เหมาจ่ายรายคน
                        </span>
                      ) : (
                        <div className="flex items-center justify-center">
                          <input
                            type="number"
                            value={row.waterPrev}
                            onChange={(e) =>
                              handleInputChange(row.room.id, 'waterPrev', parseFloat(e.target.value) || 0)
                            }
                            className={`w-24 text-center font-mono font-bold py-1 px-2 text-xs rounded-lg border transition-all ${
                              isDirty
                                ? 'border-amber-500 bg-white ring-2 ring-amber-300'
                                : 'border-slate-300 bg-white hover:border-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
                            }`}
                          />
                        </div>
                      )}
                    </td>

                    {/* WATER: Current reading */}
                    <td className="p-2 border border-slate-200 font-mono font-medium text-slate-800">
                      {row.isFlatWater ? `${row.rec?.occupants || 1} คน` : (row.rec ? row.waterCurr : '-')}
                    </td>

                    {/* WATER: Calculated Units */}
                    <td className="p-2 border border-slate-200 font-mono font-bold text-sky-800 bg-sky-50/30">
                      {row.isFlatWater ? '-' : (row.rec ? row.waterUnits : '-')}
                      {row.isWaterAnomaly && (
                        <span className="block text-[9px] text-rose-600 font-bold">เลขถอยหลัง</span>
                      )}
                    </td>

                    {/* ELEC: Starting / Baseline input */}
                    <td className="p-2 border border-slate-200 bg-amber-50/30">
                      <div className="flex items-center justify-center">
                        <input
                          type="number"
                          value={row.elecPrev}
                          onChange={(e) =>
                            handleInputChange(row.room.id, 'elecPrev', parseFloat(e.target.value) || 0)
                          }
                          className={`w-24 text-center font-mono font-bold py-1 px-2 text-xs rounded-lg border transition-all ${
                            isDirty
                              ? 'border-amber-500 bg-white ring-2 ring-amber-300'
                              : 'border-slate-300 bg-white hover:border-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                          }`}
                        />
                      </div>
                    </td>

                    {/* ELEC: Current reading */}
                    <td className="p-2 border border-slate-200 font-mono font-medium text-slate-800">
                      {row.rec ? row.elecCurr : '-'}
                    </td>

                    {/* ELEC: Calculated Units */}
                    <td className="p-2 border border-slate-200 font-mono font-bold text-amber-800 bg-amber-50/30">
                      {row.rec ? row.elecUnits : '-'}
                      {row.isElecAnomaly && (
                        <span className="block text-[9px] text-rose-600 font-bold">เลขถอยหลัง</span>
                      )}
                    </td>

                    {/* Estimated Total Amount */}
                    <td className="p-2 border border-slate-200 text-right font-black text-slate-900 bg-emerald-50/20 tabular-nums">
                      {row.rec ? `฿${formatNumber(row.rec.totalAmount)}` : '-'}
                    </td>

                    {/* Action: Save single */}
                    <td className="p-2 border border-slate-200">
                      {isDirty ? (
                        <button
                          onClick={() => handleSaveSingle(row.room)}
                          className="flex items-center justify-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[11px] transition-colors shadow-xs mx-auto"
                        >
                          <Save className="w-3 h-3" />
                          <span>บันทึก</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-700 font-medium inline-flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>พร้อมใช้</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {displayRows.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 text-xs">
                    ไม่พบข้อมูลห้องพักตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guide Banner: Dormitory Baseline Meter Best Practices */}
      <div className="bg-slate-900 text-slate-300 rounded-2xl p-5 border border-slate-800 text-xs space-y-3">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <Info className="w-4 h-4 text-sky-400" />
          <span>แนวปฏิบัติการจัดการ "เลขตั้งต้นมิเตอร์" สำหรับผู้ดูแลหอพัก</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 text-slate-400 leading-relaxed">
          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 space-y-1">
            <span className="font-bold text-sky-300 block">1. การยกยอดขึ้นรอบเดือนใหม่</span>
            <p>
              เมื่อเริ่มจดมิเตอร์รอบเดือนใหม่ ให้กดปุ่ม <b>"ยกยอดจากเดือนก่อน"</b> ระบบจะดึงเลขจดสิ้นสุดของงวดที่แล้วมาเป็นเลขตั้งต้นของงวดนี้ทันที โดยไม่ต้องกรอกซ้ำ
            </p>
          </div>
          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 space-y-1">
            <span className="font-bold text-amber-300 block">2. กรณีเปลี่ยนมิเตอร์ใหม่ / รีเซ็ตเป็น 0</span>
            <p>
              หากมีการเปลี่ยนลูกมิเตอร์น้ำหรือไฟ ให้เข้ามาที่หน้านี้แล้วเปลี่ยนเลขตั้งต้นเป็น <b>0</b> หรือเลขหน้าปัดของมิเตอร์ตัวใหม่ พร้อมระบุหมายเหตุในห้องนั้น
            </p>
          </div>
          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 space-y-1">
            <span className="font-bold text-emerald-300 block">3. การคำนวณและตรวจสอบ</span>
            <p>
              เมื่อมีการแก้ไขเลขตั้งต้น ระบบจะคำนวณจำนวนหน่วยที่ใช้และยอดเงินแจ้งหนี้ใหม่แบบ Real-time ทันที และซิงก์ไปยังใบแจ้งหนี้และตารางสรุปรายอาคาร
            </p>
          </div>
        </div>
      </div>

      {/* MODAL: Confirmation for Roll Forward */}
      {confirmRollForward.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-amber-600 font-bold text-base">
                <RotateCcw className="w-5 h-5" />
                <span>ยืนยันการยกยอดเลขมิเตอร์</span>
              </div>
              <button
                onClick={() => setConfirmRollForward({ isOpen: false, scope: 'building' })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              ระบบจะนำ <b>เลขจดมิเตอร์ล่าสุด (Current Reading)</b> ของเดือนก่อนหน้า มาตั้งเป็น <b>เลขตั้งต้น (Baseline Reading)</b> ของรอบเดือนนี้
            </p>

            <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <label className="font-bold text-slate-700 block">ขอบเขตการยกยอด:</label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    checked={confirmRollForward.scope === 'building'}
                    onChange={() => setConfirmRollForward((prev) => ({ ...prev, scope: 'building' }))}
                    className="text-sky-600"
                  />
                  <span>เฉพาะอาคาร <b>{activeBuilding.name}</b> ({buildingRooms.length} ห้อง)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    checked={confirmRollForward.scope === 'all'}
                    onChange={() => setConfirmRollForward((prev) => ({ ...prev, scope: 'all' }))}
                    className="text-sky-600"
                  />
                  <span>ทุกอาคารทั้งหมด ({masterRooms.length} ห้อง)</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmRollForward({ isOpen: false, scope: 'building' })}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleRollForwardExecute}
                className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl transition-colors shadow-xs"
              >
                ยืนยันการยกยอด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Batch Paste from Excel */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <ClipboardPaste className="w-5 h-5 text-sky-600" />
                <span>นำเข้าเลขตั้งต้นแบบชุด (Batch Paste)</span>
              </div>
              <button onClick={() => setIsBatchModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <p>
                คัดลอกจากตาราง <b>Excel</b> หรือ <b>Google Sheets</b> โดยจัดลำดับคอลัมน์ดังนี้:
              </p>
              <p className="font-mono bg-slate-100 p-2 rounded text-[11px] text-slate-700">
                [เลขห้อง] [เลขตั้งต้นน้ำ] [เลขตั้งต้นไฟ]
              </p>
              <p className="text-[11px] text-slate-400">
                ตัวอย่าง: <br />
                101 867 6829 <br />
                102 916 7170
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เลือกอาคารเป้าหมาย:
              </label>
              <select
                value={batchTargetBuilding}
                onChange={(e) => setBatchTargetBuilding(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-bold text-slate-800"
              >
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    หอพัก{b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                วางข้อความที่คัดลอกมาที่นี่:
              </label>
              <textarea
                rows={6}
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder="วางแถวข้อมูลจาก Excel ที่นี่..."
                className="w-full font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleProcessBatchPaste}
                className="px-4 py-2 text-xs font-bold bg-sky-700 hover:bg-sky-800 text-white rounded-xl transition-colors shadow-xs"
              >
                อัปเดตเลขตั้งต้น
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
