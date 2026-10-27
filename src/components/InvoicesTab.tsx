import React, { useState, useMemo } from 'react';
import {
  Printer,
  CheckSquare,
  Square,
  FileText,
  X,
  Megaphone,
  Receipt,
  Download,
  Calendar,
  CreditCard,
  Settings,
  HelpCircle,
  Eye,
  Check,
  Building,
  PhoneCall,
  Search,
  Sparkles,
} from 'lucide-react';
import { RoomDefinition, MeterRecord, BuildingConfig } from '../types';
import {
  formatNumber,
  formatMonthThai,
  getShortMonthYear,
  getPrevShortMonthYear,
} from '../data/dormData';

interface InvoicesTabProps {
  masterRooms: RoomDefinition[];
  records: Record<string, MeterRecord>;
  selectedMonth: string;
  buildings: BuildingConfig[];
}

export type InvoicePrintView = 'notice_board' | 'slips';

export const InvoicesTab: React.FC<InvoicesTabProps> = ({
  masterRooms,
  records,
  selectedMonth,
  buildings,
}) => {
  // Main view mode
  const [activeView, setActiveView] = useState<InvoicePrintView>('notice_board');

  // Building & room selection
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(buildings[0]?.id || 'thachana');
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewRecord, setPreviewRecord] = useState<MeterRecord | null>(null);

  // Print scope state
  const [printScope, setPrintScope] = useState<'single_slip' | 'selected_slips' | 'single_building' | 'all_buildings'>('single_building');
  const [singlePrintRecord, setSinglePrintRecord] = useState<MeterRecord | null>(null);

  // Notice board customization
  const [showNoticeSettings, setShowNoticeSettings] = useState<boolean>(false);
  const [dueDateText, setDueDateText] = useState<string>('วันที่ 5 ของเดือนถัดไป (08.30 - 16.30 น.)');
  const [paymentInfo, setPaymentInfo] = useState<string>(
    'ธนาคารกรุงไทย เลขที่บัญชี 987-6-54321-0 (ชื่อบัญชี: กองทุนหอพักนักศึกษา) หรือสแกน QR Code ชำระเงิน'
  );
  const [contactInfo, setContactInfo] = useState<string>(
    'ติดต่อสอบถามหรือแจ้งข้อผิดพลาด: สำนักงานหอพัก โทร 081-234-5678 (ภายใน 3 วันทำการ)'
  );
  const [signatoryName, setSignatoryName] = useState<string>('เจ้าหน้าที่บริหารจัดการหอพักนักศึกษา');

  const activeBuilding = buildings.find((b) => b.id === selectedBuildingId) || buildings[0];

  // Records for active building
  const activeBuildingRooms = useMemo(() => {
    return masterRooms.filter((r) => r.buildingId === selectedBuildingId);
  }, [masterRooms, selectedBuildingId]);

  const activeBuildingRows = useMemo(() => {
    return activeBuildingRooms.map((room) => {
      const rec = records[room.id];
      return {
        room,
        rec,
        hasRecord: !!rec,
        waterPrev: rec?.waterPrev ?? 0,
        waterCurr: rec?.waterCurr ?? 0,
        waterUnits: rec?.waterUnits ?? 0,
        waterCost: rec?.waterCost ?? 0,
        occupants: rec?.occupants ?? 1,
        elecPrev: rec?.elecPrev ?? 0,
        elecCurr: rec?.elecCurr ?? 0,
        elecUnits: rec?.elecUnits ?? 0,
        elecCost: rec?.elecCost ?? 0,
        totalAmount: rec?.totalAmount ?? 0,
        remark: rec?.remark ?? '',
      };
    });
  }, [activeBuildingRooms, records]);

  // Active building totals
  const activeBuildingTotals = useMemo(() => {
    return activeBuildingRows.reduce(
      (acc, r) => {
        acc.waterUnits += r.waterUnits;
        acc.elecUnits += r.elecUnits;
        acc.waterCost += r.waterCost;
        acc.elecCost += r.elecCost;
        acc.totalAmount += r.totalAmount;
        return acc;
      },
      { waterUnits: 0, elecUnits: 0, waterCost: 0, elecCost: 0, totalAmount: 0 }
    );
  }, [activeBuildingRows]);

  // All available records across buildings for Slips mode
  const allRecordedList = useMemo(() => {
    return Object.values(records);
  }, [records]);

  const filteredSlipsRecords = useMemo(() => {
    return allRecordedList.filter((r) => {
      if (selectedBuildingId !== 'ALL' && r.buildingId !== selectedBuildingId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchRoom = r.roomNo.toLowerCase().includes(q);
        const matchBld = r.buildingName.toLowerCase().includes(q);
        const matchRemark = (r.remark || '').toLowerCase().includes(q);
        return matchRoom || matchBld || matchRemark;
      }
      return true;
    });
  }, [allRecordedList, selectedBuildingId, searchQuery]);

  // Toggle selections for slips
  const toggleSelectAllSlips = () => {
    if (selectedRoomIds.length === filteredSlipsRecords.length) {
      setSelectedRoomIds([]);
    } else {
      setSelectedRoomIds(filteredSlipsRecords.map((r) => r.roomId));
    }
  };

  const toggleSelectOneSlip = (id: string) => {
    setSelectedRoomIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Printing handlers
  const handlePrintSingleBuildingNotice = () => {
    setPrintScope('single_building');
    setTimeout(() => {
      window.print();
    }, 50);
  };

  const handlePrintAllBuildingsNotice = () => {
    setPrintScope('all_buildings');
    setTimeout(() => {
      window.print();
    }, 50);
  };

  const handlePrintSingleSlip = (rec: MeterRecord) => {
    setSinglePrintRecord(rec);
    setPrintScope('single_slip');
    setTimeout(() => {
      window.print();
    }, 50);
  };

  const handlePrintSelectedSlips = () => {
    setSinglePrintRecord(null);
    setPrintScope('selected_slips');
    setTimeout(() => {
      window.print();
    }, 50);
  };

  // Helper for generating building data for all-building print
  const allBuildingsData = useMemo(() => {
    return buildings.map((b) => {
      const bRooms = masterRooms.filter((r) => r.buildingId === b.id);
      const bRows = bRooms.map((room) => {
        const rec = records[room.id];
        return {
          room,
          rec,
          hasRecord: !!rec,
          waterPrev: rec?.waterPrev ?? 0,
          waterCurr: rec?.waterCurr ?? 0,
          waterUnits: rec?.waterUnits ?? 0,
          waterCost: rec?.waterCost ?? 0,
          occupants: rec?.occupants ?? 1,
          elecPrev: rec?.elecPrev ?? 0,
          elecCurr: rec?.elecCurr ?? 0,
          elecUnits: rec?.elecUnits ?? 0,
          elecCost: rec?.elecCost ?? 0,
          totalAmount: rec?.totalAmount ?? 0,
          remark: rec?.remark ?? '',
        };
      });
      const totals = bRows.reduce(
        (acc, r) => {
          acc.waterUnits += r.waterUnits;
          acc.elecUnits += r.elecUnits;
          acc.waterCost += r.waterCost;
          acc.elecCost += r.elecCost;
          acc.totalAmount += r.totalAmount;
          return acc;
        },
        { waterUnits: 0, elecUnits: 0, waterCost: 0, elecCost: 0, totalAmount: 0 }
      );
      return { building: b, rows: bRows, totals };
    });
  }, [buildings, masterRooms, records]);

  // Slips to print
  const slipsToPrint = useMemo(() => {
    if (printScope === 'single_slip' && singlePrintRecord) {
      return [singlePrintRecord];
    }
    if (selectedRoomIds.length > 0) {
      return filteredSlipsRecords.filter((r) => selectedRoomIds.includes(r.roomId));
    }
    return filteredSlipsRecords;
  }, [printScope, singlePrintRecord, selectedRoomIds, filteredSlipsRecords]);

  return (
    <div className="space-y-6">
      {/* Top Banner and Navigation */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs no-print space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-xs font-bold uppercase tracking-wider">
                Official Billing & Notice System
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500 font-medium">ประจำเดือน {formatMonthThai(selectedMonth)}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              ศูนย์พิมพ์ใบแจ้งค่าใช้จ่าย & ประกาศติดบอร์ด (Print & PDF Export)
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              เลือกพิมพ์ <b>ประกาศรวมทั้งอาคาร (A4 สำหรับติดบอร์ดประชาสัมพันธ์)</b> หรือ <b>สลิปใบแจ้งหนี้รายห้อง (สำหรับส่งนักศึกษา/ผู้เช่า)</b> พร้อมส่งออกเป็น PDF ทันที
            </p>
          </div>

          {/* Quick PDF instructions helper */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 max-w-sm flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">เคล็ดลับการบันทึกเป็น PDF:</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                เมื่อกดปุ่มพิมพ์ ในหน้าต่างเบราว์เซอร์ให้เลือกช่อง <b>เครื่องพิมพ์ (Destination)</b> เป็น <b>"Save as PDF / บันทึกเป็น PDF"</b>
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Toggle: Notice Board vs Slips */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveView('notice_board')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
                activeView === 'notice_board'
                  ? 'bg-slate-900 text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Megaphone className="w-4 h-4 text-amber-400" />
              <span>1. ประกาศติดบอร์ด (ทั้งอาคาร A4)</span>
            </button>
            <button
              onClick={() => setActiveView('slips')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
                activeView === 'slips'
                  ? 'bg-slate-900 text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Receipt className="w-4 h-4 text-sky-400" />
              <span>2. สลิปใบแจ้งหนี้รายห้อง (แจกผู้เช่า)</span>
            </button>
          </div>

          {/* Notice Settings toggle button */}
          {activeView === 'notice_board' && (
            <button
              onClick={() => setShowNoticeSettings(!showNoticeSettings)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                showNoticeSettings
                  ? 'bg-sky-50 text-sky-800 border-sky-300 ring-2 ring-sky-200'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>{showNoticeSettings ? 'ซ่อนตั้งค่าข้อความประกาศ' : 'แก้ไขข้อความประกาศ/กำหนดชำระ'}</span>
            </button>
          )}
        </div>

        {/* Collapsible Notice Settings Box */}
        {activeView === 'notice_board' && showNoticeSettings && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-sky-600" />
                <span>ปรับแต่งข้อความในประกาศติดบอร์ด (จะแสดงบนหัวและท้ายกระดาษ A4)</span>
              </span>
              <span className="text-[11px] text-slate-500">ข้อมูลนี้จะถูกพิมพ์ลงในใบประกาศจริง</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  กำหนดชำระเงินภายในวันที่:
                </label>
                <input
                  type="text"
                  value={dueDateText}
                  onChange={(e) => setDueDateText(e.target.value)}
                  placeholder="เช่น วันที่ 5 ของเดือนถัดไป (08.30 - 16.30 น.)"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  ชื่อหน่วยงาน/ผู้ลงนามในประกาศ:
                </label>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  placeholder="เช่น สำนักงานบริหารจัดการหอพักนักศึกษา"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">
                  ช่องทางการชำระเงิน (เลขที่บัญชี / พร้อมเพย์ / สแกน QR):
                </label>
                <input
                  type="text"
                  value={paymentInfo}
                  onChange={(e) => setPaymentInfo(e.target.value)}
                  placeholder="ระบุเลขบัญชีหรือช่องทางชำระเงิน..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">
                  ข้อความติดต่อสอบถาม/หมายเหตุท้ายประกาศ:
                </label>
                <input
                  type="text"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="ระบุเบอร์โทรหรือเวลาทำการ..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          VIEW 1: NOTICE BOARD ANNOUNCEMENT (ทั้งอาคาร A4)
      ========================================================================== */}
      {activeView === 'notice_board' && (
        <div className="space-y-5 no-print">
          {/* Building Selector Strip & Actions */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                เลือกอาคารที่จะพิมพ์ประกาศติดบอร์ด:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {buildings.map((b) => {
                  const bRooms = masterRooms.filter((r) => r.buildingId === b.id);
                  const isSelected = selectedBuildingId === b.id;
                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBuildingId(b.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-sky-700 text-white shadow-xs ring-2 ring-sky-300'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>{b.name}</span>
                      <span className="text-[10px] opacity-80 font-mono">({bRooms.length} ห้อง)</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Print Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={handlePrintSingleBuildingNotice}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold transition-all shadow-md active:scale-95"
                title="พิมพ์ประกาศติดบอร์ดอาคารนี้ออกทางเครื่องพิมพ์ หรือบันทึกเป็น PDF"
              >
                <Printer className="w-4 h-4 text-amber-300" />
                <span>พิมพ์ประกาศติดบอร์ดหอพัก{activeBuilding.name} (PDF)</span>
              </button>

              <button
                onClick={handlePrintAllBuildingsNotice}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-xs"
                title="พิมพ์ประกาศครบทั้ง 8 อาคาร ต่อเนื่องกันเป็นชุด A4"
              >
                <Building className="w-3.5 h-3.5 text-slate-300" />
                <span>พิมพ์ครบทุกอาคาร (8 อาคาร)</span>
              </button>
            </div>
          </div>

          {/* Interactive Document Preview (Simulation of A4 Paper Sheet) */}
          <div className="bg-slate-200/70 p-4 sm:p-8 rounded-2xl border border-slate-300 shadow-inner flex flex-col items-center">
            <div className="w-full max-w-4xl flex items-center justify-between pb-3 text-xs text-slate-600 font-semibold">
              <span className="flex items-center gap-1.5 text-sky-800">
                <Eye className="w-4 h-4" />
                <span>ตัวอย่างหน้ากระดาษประกาศติดบอร์ดจริง (A4 Document Preview)</span>
              </span>
              <button
                onClick={handlePrintSingleBuildingNotice}
                className="text-sky-700 hover:text-sky-900 underline font-bold flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>สั่งพิมพ์หน้านี้</span>
              </button>
            </div>

            {/* The Simulated Sheet */}
            <div className="w-full max-w-4xl bg-white shadow-2xl rounded-sm border border-slate-300 p-6 sm:p-10 font-sans text-slate-900 space-y-5">
              {/* Top Corner Code */}
              <div className="text-right text-xs font-bold text-slate-600">
                {activeBuilding.name} {getShortMonthYear(selectedMonth)}
              </div>

              {/* Official Header */}
              <div className="text-center space-y-1 pb-3 border-b-2 border-slate-900">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-950">
                  รายการแจ้งหนี้ค่าน้ำประปา - ค่าไฟฟ้า ของนักศึกษาหอพัก{activeBuilding.name}
                </h2>
                <p className="text-sm font-semibold text-slate-700">
                  ประจำเดือน {formatMonthThai(selectedMonth)}
                </p>
              </div>

              {/* Notice Banner for Students */}
              <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-3 text-xs text-slate-900 space-y-1 shadow-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                  <Megaphone className="w-4 h-4 text-amber-700" />
                  <span>ประกาศแจ้งกำหนดการชำระเงินและช่องทางการโอน:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div>
                    <span className="text-slate-600">📅 กำหนดชำระภายใน: </span>
                    <b className="text-rose-700 font-bold">{dueDateText}</b>
                  </div>
                  <div>
                    <span className="text-slate-600">🏦 ช่องทางชำระเงิน: </span>
                    <b className="text-slate-900">{paymentInfo}</b>
                  </div>
                </div>
              </div>

              {/* 11-Column Dorm Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs print-table border-collapse border border-slate-800">
                  <thead>
                    <tr className="bg-slate-100 font-bold border-b border-slate-800">
                      <th rowSpan={2} className="py-2 px-1 w-12 border border-slate-800">
                        ห้อง
                      </th>
                      <th colSpan={3} className="py-1 px-1 border border-slate-800">
                        เลขมิเตอร์ค่าน้ำประปา
                      </th>
                      <th colSpan={3} className="py-1 px-1 border border-slate-800">
                        เลขมิเตอร์ค่าไฟฟ้า
                      </th>
                      <th colSpan={3} className="py-1 px-1 border border-slate-800">
                        จำนวนเงิน (บาท)
                      </th>
                      <th rowSpan={2} className="py-2 px-1 w-28 border border-slate-800">
                        หมายเหตุ / ลายมือชื่อ
                      </th>
                    </tr>
                    <tr className="bg-slate-100 font-semibold border-b border-slate-800 text-[11px]">
                      <th className="py-1 px-1 w-14 border border-slate-800">
                        {getPrevShortMonthYear(selectedMonth)} (ตั้งต้น)
                      </th>
                      <th className="py-1 px-1 w-14 border border-slate-800">
                        {getShortMonthYear(selectedMonth)} (ใหม่)
                      </th>
                      <th className="py-1 px-1 w-12 border border-slate-800">จำนวนใช้</th>
                      <th className="py-1 px-1 w-14 border border-slate-800">
                        {getPrevShortMonthYear(selectedMonth)} (ตั้งต้น)
                      </th>
                      <th className="py-1 px-1 w-14 border border-slate-800">
                        {getShortMonthYear(selectedMonth)} (ใหม่)
                      </th>
                      <th className="py-1 px-1 w-12 border border-slate-800">จำนวนใช้</th>
                      <th className="py-1 px-1 w-16 border border-slate-800">ค่าน้ำประปา</th>
                      <th className="py-1 px-1 w-16 border border-slate-800">ค่าไฟฟ้า</th>
                      <th className="py-1 px-1 w-16 border border-slate-800">รวมเงิน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeBuildingRows.map((r) => (
                      <tr key={r.room.id} className="hover:bg-slate-50/80">
                        <td className="py-1.5 px-1 font-bold border border-slate-800">{r.room.roomNo}</td>

                        {/* Water */}
                        <td className="py-1.5 px-1 border border-slate-800 font-mono">
                          {r.hasRecord ? (r.room.waterType === 'flat_per_person' ? '-' : r.waterPrev) : ''}
                        </td>
                        <td className="py-1.5 px-1 border border-slate-800 font-mono">
                          {r.hasRecord
                            ? r.room.waterType === 'flat_per_person'
                              ? `${r.occupants} คน`
                              : r.waterCurr
                            : ''}
                        </td>
                        <td className="py-1.5 px-1 border border-slate-800 font-mono font-semibold">
                          {r.hasRecord ? (r.room.waterType === 'flat_per_person' ? '0' : r.waterUnits) : ''}
                        </td>

                        {/* Electric */}
                        <td className="py-1.5 px-1 border border-slate-800 font-mono">
                          {r.hasRecord ? r.elecPrev : ''}
                        </td>
                        <td className="py-1.5 px-1 border border-slate-800 font-mono">
                          {r.hasRecord ? r.elecCurr : ''}
                        </td>
                        <td className="py-1.5 px-1 border border-slate-800 font-mono font-semibold">
                          {r.hasRecord ? r.elecUnits : ''}
                        </td>

                        {/* Amounts */}
                        <td className="py-1.5 px-1 border border-slate-800 text-right font-mono">
                          {r.hasRecord ? formatNumber(r.waterCost) : ''}
                        </td>
                        <td className="py-1.5 px-1 border border-slate-800 text-right font-mono">
                          {r.hasRecord ? formatNumber(r.elecCost) : ''}
                        </td>
                        <td className="py-1.5 px-1 border border-slate-800 text-right font-mono font-bold">
                          {r.hasRecord ? formatNumber(r.totalAmount) : ''}
                        </td>

                        {/* Remarks */}
                        <td className="py-1.5 px-1 border border-slate-800 text-left text-[11px]">
                          {r.remark || ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals Row */}
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-900">
                    <tr>
                      <td className="py-2 px-1 border border-slate-800">รวมทั้งสิ้น</td>
                      <td colSpan={2} className="py-2 px-1 border border-slate-800 text-slate-500"></td>
                      <td className="py-2 px-1 border border-slate-800 font-mono">
                        {formatNumber(activeBuildingTotals.waterUnits)}
                      </td>
                      <td colSpan={2} className="py-2 px-1 border border-slate-800 text-slate-500"></td>
                      <td className="py-2 px-1 border border-slate-800 font-mono">
                        {formatNumber(activeBuildingTotals.elecUnits)}
                      </td>
                      <td className="py-2 px-1 border border-slate-800 text-right font-mono">
                        {formatNumber(activeBuildingTotals.waterCost)}
                      </td>
                      <td className="py-2 px-1 border border-slate-800 text-right font-mono">
                        {formatNumber(activeBuildingTotals.elecCost)}
                      </td>
                      <td className="py-2 px-1 border border-slate-800 text-right font-mono font-black text-sm">
                        {formatNumber(activeBuildingTotals.totalAmount)}
                      </td>
                      <td className="py-2 px-1 border border-slate-800"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Bottom Notice & Signature Block */}
              <div className="pt-4 space-y-4 text-xs">
                <div className="text-[11px] text-slate-600 italic">
                  * {contactInfo}
                </div>

                <div className="grid grid-cols-2 gap-8 pt-4">
                  <div className="space-y-6 text-center">
                    <p className="text-slate-500 text-[11px]">เจ้าหน้าที่ผู้บันทึก/ตรวจสอบข้อมูล</p>
                    <div className="border-b border-slate-400 w-48 mx-auto"></div>
                    <p className="font-semibold">(........................................................)</p>
                  </div>
                  <div className="space-y-6 text-center">
                    <p className="text-slate-500 text-[11px]">{signatoryName}</p>
                    <div className="border-b border-slate-400 w-48 mx-auto"></div>
                    <p className="font-semibold">(........................................................)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: INDIVIDUAL ROOM SLIPS (สลิปใบแจ้งหนี้รายห้อง)
      ========================================================================== */}
      {activeView === 'slips' && (
        <div className="space-y-5 no-print">
          {/* Slips Filter & Control Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Building dropdown */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600">กรองอาคาร:</label>
                <select
                  value={selectedBuildingId}
                  onChange={(e) => {
                    setSelectedBuildingId(e.target.value);
                    setSelectedRoomIds([]);
                  }}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
                >
                  <option value="ALL">ทุกอาคาร ({allRecordedList.length} ห้อง)</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Room search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาเลขห้อง..."
                  className="bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs w-36 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Print Selection Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handlePrintSelectedSlips}
                disabled={filteredSlipsRecords.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
              >
                <Printer className="w-4 h-4 text-amber-300" />
                <span>
                  พิมพ์สลิปใบแจ้งหนี้ (
                  {selectedRoomIds.length > 0 ? `${selectedRoomIds.length} ห้องที่เลือก` : `ทั้งหมด ${filteredSlipsRecords.length} ห้อง`}
                  )
                </span>
              </button>
            </div>
          </div>

          {/* Table List of Rooms with Direct 1-Click Print on Each Row */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
              <button
                onClick={toggleSelectAllSlips}
                className="flex items-center gap-2 font-bold text-slate-700 hover:text-slate-900"
              >
                {selectedRoomIds.length === filteredSlipsRecords.length && filteredSlipsRecords.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-sky-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>
                  เลือกทั้งหมด ({selectedRoomIds.length}/{filteredSlipsRecords.length} ห้อง)
                </span>
              </button>
              <span className="text-[11px] text-slate-500">
                คลิกปุ่ม <b>"พิมพ์ (PDF)"</b> ในแถวเพื่อพิมพ์สลิปเดี่ยวเฉพาะห้องนั้นได้ทันที
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3 w-10 text-center">เลือก</th>
                    <th className="p-3">อาคาร / ห้อง</th>
                    <th className="p-3">ค่าน้ำประปา</th>
                    <th className="p-3">ค่าไฟฟ้า</th>
                    <th className="p-3 text-right">ยอดเงินรวม</th>
                    <th className="p-3">หมายเหตุ</th>
                    <th className="p-3 text-center w-36">พิมพ์ / ดูสลิป</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredSlipsRecords.map((r) => {
                    const isSelected = selectedRoomIds.includes(r.roomId);
                    return (
                      <tr key={r.roomId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOneSlip(r.roomId)}
                            className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                          />
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-slate-900 block text-sm">ห้อง {r.roomNo}</span>
                          <span className="text-slate-500 text-[11px]">{r.buildingName}</span>
                        </td>
                        <td className="p-3">
                          {r.waterType === 'flat_per_person' ? (
                            <span className="text-sky-900 font-medium">เหมา {r.occupants || 1} คน · ฿{formatNumber(r.waterCost)}</span>
                          ) : (
                            <span>
                              {r.waterPrev} ➔ {r.waterCurr} (<b>{r.waterUnits}</b> หน่วย) · <b className="text-sky-900">฿{formatNumber(r.waterCost)}</b>
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span>
                            {r.elecPrev} ➔ {r.elecCurr} (<b>{r.elecUnits}</b> หน่วย) · <b className="text-amber-900">฿{formatNumber(r.elecCost)}</b>
                          </span>
                        </td>
                        <td className="p-3 text-right font-black text-slate-900 text-sm tabular-nums">
                          ฿{formatNumber(r.totalAmount)}
                        </td>
                        <td className="p-3 text-slate-500 text-[11px]">{r.remark || '-'}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Direct Print Button */}
                            <button
                              onClick={() => handlePrintSingleSlip(r)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-700 hover:bg-sky-800 text-white text-[11px] font-bold transition-all shadow-2xs"
                              title="พิมพ์สลิปห้องนี้ออกเป็น PDF ทันที"
                            >
                              <Printer className="w-3.5 h-3.5 text-amber-300" />
                              <span>พิมพ์ (PDF)</span>
                            </button>

                            {/* View Modal Button */}
                            <button
                              onClick={() => setPreviewRecord(r)}
                              className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] transition-colors border border-slate-200"
                              title="เปิดดูรายละเอียดใบแจ้งหนี้"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSlipsRecords.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                        ไม่พบข้อมูลมิเตอร์ที่ตรงกับเงื่อนไขการค้นหา
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SINGLE ROOM INVOICE MODAL (On-Screen Preview)
      ========================================================================== */}
      {previewRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 no-print animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-xs text-sky-400 font-bold uppercase tracking-wider">{previewRecord.buildingName}</span>
                <h3 className="text-lg font-bold">ใบแจ้งหนี้ ห้อง {previewRecord.roomNo}</h3>
              </div>
              <button
                onClick={() => setPreviewRecord(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-700 font-sans">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 font-medium">ประจำเดือน:</span>
                <span className="font-bold text-slate-900">{formatMonthThai(selectedMonth)}</span>
              </div>

              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="p-2">รายการ</th>
                    <th className="p-2 text-center">หน่วยที่ใช้</th>
                    <th className="p-2 text-right">จำนวนเงิน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-2 font-medium">ค่าน้ำประปา</td>
                    <td className="p-2 text-center font-mono">
                      {previewRecord.waterType === 'flat_per_person'
                        ? `${previewRecord.occupants || 1} คน (เหมา)`
                        : `${previewRecord.waterUnits} หน่วย`}
                    </td>
                    <td className="p-2 text-right font-bold text-sky-800 font-mono">
                      ฿{formatNumber(previewRecord.waterCost)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">ค่าไฟฟ้า</td>
                    <td className="p-2 text-center font-mono">{previewRecord.elecUnits} หน่วย</td>
                    <td className="p-2 text-right font-bold text-amber-800 font-mono">
                      ฿{formatNumber(previewRecord.elecCost)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {previewRecord.remark && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px]">
                  <b>หมายเหตุ:</b> {previewRecord.remark}
                </div>
              )}

              {/* Payment Details in Modal */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 space-y-1">
                <div><b>กำหนดชำระ:</b> {dueDateText}</div>
                <div><b>ช่องทางชำระเงิน:</b> {paymentInfo}</div>
              </div>

              <div className="p-3.5 bg-slate-900 text-white rounded-xl flex justify-between items-center font-bold">
                <span className="text-slate-300">ยอดรวมชำระทั้งสิ้น:</span>
                <span className="text-xl text-amber-400 font-black font-mono">
                  ฿{formatNumber(previewRecord.totalAmount)}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setPreviewRecord(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-semibold"
                >
                  ปิด
                </button>
                <button
                  onClick={() => {
                    handlePrintSingleSlip(previewRecord);
                  }}
                  className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-4 h-4 text-amber-300" />
                  <span>พิมพ์ใบแจ้งหนี้ห้องนี้ (PDF)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PRINT-ONLY TARGETS (Rendered strictly when window.print() is called)
      ========================================================================== */}

      {/* 1. PRINT-ONLY: SINGLE BUILDING NOTICE BOARD ANNOUNCEMENT */}
      {printScope === 'single_building' && (
        <div className="print-only">
          <div className="max-w-4xl mx-auto font-sans p-2">
            <div className="text-right text-xs font-bold mb-1">
              หอพัก{activeBuilding.name} {getShortMonthYear(selectedMonth)}
            </div>

            <div className="text-center mb-3">
              <h1 className="text-base font-bold tracking-wide">
                รายการแจ้งหนี้ค่าน้ำประปา - ค่าไฟฟ้า ของนักศึกษาหอพัก{activeBuilding.name}
              </h1>
              <h2 className="text-sm font-bold mt-0.5">ประจำเดือน {formatMonthThai(selectedMonth)}</h2>
            </div>

            {/* Announcement Box on Paper */}
            <div className="border-2 border-slate-900 p-2.5 rounded mb-3 text-xs bg-slate-50">
              <div className="font-bold flex items-center gap-1 mb-1">
                <span>📌 ประกาศสำคัญถึงผู้พักอาศัย:</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div><b>กำหนดชำระเงินภายใน:</b> {dueDateText}</div>
                <div><b>ช่องทางชำระเงิน:</b> {paymentInfo}</div>
              </div>
            </div>

            {/* Table */}
            <table className="w-full text-center text-xs print-table border-collapse border border-slate-900">
              <thead>
                <tr className="bg-slate-100 font-bold">
                  <th rowSpan={2} className="py-1.5 px-1 w-12 border border-slate-900">ห้อง</th>
                  <th colSpan={3} className="py-1 px-1 border border-slate-900">เลขมิเตอร์ค่าน้ำประปา</th>
                  <th colSpan={3} className="py-1 px-1 border border-slate-900">เลขมิเตอร์ค่าไฟฟ้า</th>
                  <th colSpan={3} className="py-1 px-1 border border-slate-900">จำนวนเงิน (บาท)</th>
                  <th rowSpan={2} className="py-1.5 px-1 w-28 border border-slate-900">หมายเหตุ / ลายมือชื่อ</th>
                </tr>
                <tr className="bg-slate-100 text-[10px] font-semibold">
                  <th className="py-1 px-1 w-14 border border-slate-900">{getPrevShortMonthYear(selectedMonth)} (ตั้งต้น)</th>
                  <th className="py-1 px-1 w-14 border border-slate-900">{getShortMonthYear(selectedMonth)} (ใหม่)</th>
                  <th className="py-1 px-1 w-12 border border-slate-900">จำนวนใช้</th>
                  <th className="py-1 px-1 w-14 border border-slate-900">{getPrevShortMonthYear(selectedMonth)} (ตั้งต้น)</th>
                  <th className="py-1 px-1 w-14 border border-slate-900">{getShortMonthYear(selectedMonth)} (ใหม่)</th>
                  <th className="py-1 px-1 w-12 border border-slate-900">จำนวนใช้</th>
                  <th className="py-1 px-1 w-16 border border-slate-900">ค่าน้ำประปา</th>
                  <th className="py-1 px-1 w-16 border border-slate-900">ค่าไฟฟ้า</th>
                  <th className="py-1 px-1 w-16 border border-slate-900">รวมเงิน</th>
                </tr>
              </thead>
              <tbody>
                {activeBuildingRows.map((r) => (
                  <tr key={r.room.id}>
                    <td className="py-1 px-1 font-bold border border-slate-900">{r.room.roomNo}</td>
                    <td className="py-1 px-1 border border-slate-900">
                      {r.hasRecord ? (r.room.waterType === 'flat_per_person' ? '-' : r.waterPrev) : ''}
                    </td>
                    <td className="py-1 px-1 border border-slate-900">
                      {r.hasRecord
                        ? r.room.waterType === 'flat_per_person'
                          ? `${r.occupants} คน`
                          : r.waterCurr
                        : ''}
                    </td>
                    <td className="py-1 px-1 border border-slate-900 font-semibold">
                      {r.hasRecord ? (r.room.waterType === 'flat_per_person' ? '0' : r.waterUnits) : ''}
                    </td>
                    <td className="py-1 px-1 border border-slate-900">{r.hasRecord ? r.elecPrev : ''}</td>
                    <td className="py-1 px-1 border border-slate-900">{r.hasRecord ? r.elecCurr : ''}</td>
                    <td className="py-1 px-1 border border-slate-900 font-semibold">{r.hasRecord ? r.elecUnits : ''}</td>
                    <td className="py-1 px-1 border border-slate-900 text-right">{r.hasRecord ? formatNumber(r.waterCost) : ''}</td>
                    <td className="py-1 px-1 border border-slate-900 text-right">{r.hasRecord ? formatNumber(r.elecCost) : ''}</td>
                    <td className="py-1 px-1 border border-slate-900 text-right font-bold">{r.hasRecord ? formatNumber(r.totalAmount) : ''}</td>
                    <td className="py-1 px-1 border border-slate-900 text-left text-[10px]">{r.remark || ''}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="font-bold border-t-2 border-slate-900">
                <tr>
                  <td className="py-1 px-1 border border-slate-900">รวมเงินทั้งสิ้น</td>
                  <td colSpan={2} className="py-1 px-1 border border-slate-900"></td>
                  <td className="py-1 px-1 border border-slate-900">{formatNumber(activeBuildingTotals.waterUnits)}</td>
                  <td colSpan={2} className="py-1 px-1 border border-slate-900"></td>
                  <td className="py-1 px-1 border border-slate-900">{formatNumber(activeBuildingTotals.elecUnits)}</td>
                  <td className="py-1 px-1 border border-slate-900 text-right">{formatNumber(activeBuildingTotals.waterCost)}</td>
                  <td className="py-1 px-1 border border-slate-900 text-right">{formatNumber(activeBuildingTotals.elecCost)}</td>
                  <td className="py-1 px-1 border border-slate-900 text-right font-black">{formatNumber(activeBuildingTotals.totalAmount)}</td>
                  <td className="py-1 px-1 border border-slate-900"></td>
                </tr>
              </tfoot>
            </table>

            {/* Signature on Paper */}
            <div className="pt-4 space-y-4 text-xs">
              <div className="text-[10px] text-slate-700 italic">* {contactInfo}</div>
              <div className="grid grid-cols-2 gap-8 pt-4">
                <div className="space-y-6 text-center">
                  <p className="text-[10px] text-slate-600">เจ้าหน้าที่ผู้ตรวจสอบ</p>
                  <div className="border-b border-slate-400 w-44 mx-auto"></div>
                  <p className="font-semibold">(........................................................)</p>
                </div>
                <div className="space-y-6 text-center">
                  <p className="text-[10px] text-slate-600">{signatoryName}</p>
                  <div className="border-b border-slate-400 w-44 mx-auto"></div>
                  <p className="font-semibold">(........................................................)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. PRINT-ONLY: ALL BUILDINGS NOTICE BOARD ANNOUNCEMENT */}
      {printScope === 'all_buildings' && (
        <div className="print-only">
          {allBuildingsData.map(({ building, rows, totals }) => (
            <div key={building.id} className="page-break max-w-4xl mx-auto font-sans p-2">
              <div className="text-right text-xs font-bold mb-1">
                หอพัก{building.name} {getShortMonthYear(selectedMonth)}
              </div>

              <div className="text-center mb-3">
                <h1 className="text-base font-bold tracking-wide">
                  รายการแจ้งหนี้ค่าน้ำประปา - ค่าไฟฟ้า ของนักศึกษาหอพัก{building.name}
                </h1>
                <h2 className="text-sm font-bold mt-0.5">ประจำเดือน {formatMonthThai(selectedMonth)}</h2>
              </div>

              <div className="border-2 border-slate-900 p-2.5 rounded mb-3 text-xs bg-slate-50">
                <div className="font-bold flex items-center gap-1 mb-1">
                  <span>📌 ประกาศสำคัญถึงผู้พักอาศัย:</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><b>กำหนดชำระเงินภายใน:</b> {dueDateText}</div>
                  <div><b>ช่องทางชำระเงิน:</b> {paymentInfo}</div>
                </div>
              </div>

              <table className="w-full text-center text-xs print-table border-collapse border border-slate-900">
                <thead>
                  <tr className="bg-slate-100 font-bold">
                    <th rowSpan={2} className="py-1.5 px-1 w-12 border border-slate-900">ห้อง</th>
                    <th colSpan={3} className="py-1 px-1 border border-slate-900">เลขมิเตอร์ค่าน้ำประปา</th>
                    <th colSpan={3} className="py-1 px-1 border border-slate-900">เลขมิเตอร์ค่าไฟฟ้า</th>
                    <th colSpan={3} className="py-1 px-1 border border-slate-900">จำนวนเงิน (บาท)</th>
                    <th rowSpan={2} className="py-1.5 px-1 w-28 border border-slate-900">หมายเหตุ / ลายมือชื่อ</th>
                  </tr>
                  <tr className="bg-slate-100 text-[10px] font-semibold">
                    <th className="py-1 px-1 w-14 border border-slate-900">{getPrevShortMonthYear(selectedMonth)} (ตั้งต้น)</th>
                    <th className="py-1 px-1 w-14 border border-slate-900">{getShortMonthYear(selectedMonth)} (ใหม่)</th>
                    <th className="py-1 px-1 w-12 border border-slate-900">จำนวนใช้</th>
                    <th className="py-1 px-1 w-14 border border-slate-900">{getPrevShortMonthYear(selectedMonth)} (ตั้งต้น)</th>
                    <th className="py-1 px-1 w-14 border border-slate-900">{getShortMonthYear(selectedMonth)} (ใหม่)</th>
                    <th className="py-1 px-1 w-12 border border-slate-900">จำนวนใช้</th>
                    <th className="py-1 px-1 w-16 border border-slate-900">ค่าน้ำประปา</th>
                    <th className="py-1 px-1 w-16 border border-slate-900">ค่าไฟฟ้า</th>
                    <th className="py-1 px-1 w-16 border border-slate-900">รวมเงิน</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.room.id}>
                      <td className="py-1 px-1 font-bold border border-slate-900">{r.room.roomNo}</td>
                      <td className="py-1 px-1 border border-slate-900">
                        {r.hasRecord ? (r.room.waterType === 'flat_per_person' ? '-' : r.waterPrev) : ''}
                      </td>
                      <td className="py-1 px-1 border border-slate-900">
                        {r.hasRecord
                          ? r.room.waterType === 'flat_per_person'
                            ? `${r.occupants} คน`
                            : r.waterCurr
                          : ''}
                      </td>
                      <td className="py-1 px-1 border border-slate-900 font-semibold">
                        {r.hasRecord ? (r.room.waterType === 'flat_per_person' ? '0' : r.waterUnits) : ''}
                      </td>
                      <td className="py-1 px-1 border border-slate-900">{r.hasRecord ? r.elecPrev : ''}</td>
                      <td className="py-1 px-1 border border-slate-900">{r.hasRecord ? r.elecCurr : ''}</td>
                      <td className="py-1 px-1 border border-slate-900 font-semibold">{r.hasRecord ? r.elecUnits : ''}</td>
                      <td className="py-1 px-1 border border-slate-900 text-right">{r.hasRecord ? formatNumber(r.waterCost) : ''}</td>
                      <td className="py-1 px-1 border border-slate-900 text-right">{r.hasRecord ? formatNumber(r.elecCost) : ''}</td>
                      <td className="py-1 px-1 border border-slate-900 text-right font-bold">{r.hasRecord ? formatNumber(r.totalAmount) : ''}</td>
                      <td className="py-1 px-1 border border-slate-900 text-left text-[10px]">{r.remark || ''}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="font-bold border-t-2 border-slate-900">
                  <tr>
                    <td className="py-1 px-1 border border-slate-900">รวมเงินทั้งสิ้น</td>
                    <td colSpan={2} className="py-1 px-1 border border-slate-900"></td>
                    <td className="py-1 px-1 border border-slate-900">{formatNumber(totals.waterUnits)}</td>
                    <td colSpan={2} className="py-1 px-1 border border-slate-900"></td>
                    <td className="py-1 px-1 border border-slate-900">{formatNumber(totals.elecUnits)}</td>
                    <td className="py-1 px-1 border border-slate-900 text-right">{formatNumber(totals.waterCost)}</td>
                    <td className="py-1 px-1 border border-slate-900 text-right">{formatNumber(totals.elecCost)}</td>
                    <td className="py-1 px-1 border border-slate-900 text-right font-black">{formatNumber(totals.totalAmount)}</td>
                    <td className="py-1 px-1 border border-slate-900"></td>
                  </tr>
                </tfoot>
              </table>

              <div className="pt-4 space-y-4 text-xs">
                <div className="text-[10px] text-slate-700 italic">* {contactInfo}</div>
                <div className="grid grid-cols-2 gap-8 pt-4">
                  <div className="space-y-6 text-center">
                    <p className="text-[10px] text-slate-600">เจ้าหน้าที่ผู้ตรวจสอบ</p>
                    <div className="border-b border-slate-400 w-44 mx-auto"></div>
                    <p className="font-semibold">(........................................................)</p>
                  </div>
                  <div className="space-y-6 text-center">
                    <p className="text-[10px] text-slate-600">{signatoryName}</p>
                    <div className="border-b border-slate-400 w-44 mx-auto"></div>
                    <p className="font-semibold">(........................................................)</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. PRINT-ONLY: STUDENT INVOICE SLIPS (Single or Selected) */}
      {(printScope === 'single_slip' || printScope === 'selected_slips') && (
        <div className="print-only">
          {slipsToPrint.map((rec) => (
            <div key={rec.roomId} className="page-break p-6 max-w-xl mx-auto font-sans">
              <div className="border-2 border-slate-900 p-6 rounded-xl space-y-4 print-break-inside-avoid">
                <div className="text-center pb-3 border-b-2 border-slate-900">
                  <h2 className="text-xl font-black">ใบแจ้งหนี้ค่าน้ำประปา - ค่าไฟฟ้า</h2>
                  <p className="text-xs text-slate-600">ประจำเดือน {formatMonthThai(selectedMonth)}</p>
                </div>

                <div className="grid grid-cols-2 text-xs font-bold py-1 border-b border-slate-300">
                  <div>หอพัก: {rec.buildingName}</div>
                  <div className="text-right">ห้องพักเลขที่: {rec.roomNo}</div>
                </div>

                <table className="w-full text-left text-xs border-collapse my-3 print-table border border-slate-900">
                  <thead>
                    <tr className="bg-slate-200 text-slate-900 font-bold">
                      <th className="py-1.5 px-2 border border-slate-900">รายการ</th>
                      <th className="py-1.5 px-2 text-center border border-slate-900">เลขตั้งต้น</th>
                      <th className="py-1.5 px-2 text-center border border-slate-900">เลขจดใหม่</th>
                      <th className="py-1.5 px-2 text-center border border-slate-900">หน่วยใช้</th>
                      <th className="py-1.5 px-2 text-right border border-slate-900">จำนวนเงิน (บาท)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-1.5 px-2 border border-slate-900">
                        ค่าน้ำประปา ({rec.waterType === 'flat_per_person' ? 'เหมาคน' : '20 บ./หน่วย'})
                      </td>
                      <td className="py-1.5 px-2 text-center border border-slate-900">
                        {rec.waterType === 'flat_per_person' ? '-' : rec.waterPrev}
                      </td>
                      <td className="py-1.5 px-2 text-center border border-slate-900">
                        {rec.waterType === 'flat_per_person' ? `${rec.occupants || 1} คน` : rec.waterCurr}
                      </td>
                      <td className="py-1.5 px-2 text-center font-bold border border-slate-900">
                        {rec.waterType === 'flat_per_person' ? `${rec.occupants || 1} คน` : rec.waterUnits}
                      </td>
                      <td className="py-1.5 px-2 text-right font-bold border border-slate-900">
                        ฿{formatNumber(rec.waterCost)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 border border-slate-900">ค่าไฟฟ้า (หน่วยละ 6 บ.)</td>
                      <td className="py-1.5 px-2 text-center border border-slate-900">{rec.elecPrev}</td>
                      <td className="py-1.5 px-2 text-center border border-slate-900">{rec.elecCurr}</td>
                      <td className="py-1.5 px-2 text-center font-bold border border-slate-900">{rec.elecUnits}</td>
                      <td className="py-1.5 px-2 text-right font-bold border border-slate-900">
                        ฿{formatNumber(rec.elecCost)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {rec.remark && (
                  <div className="text-xs text-slate-700 italic">หมายเหตุ: {rec.remark}</div>
                )}

                {/* Due Date & Bank Details on Student Slip */}
                <div className="bg-slate-50 border border-slate-300 p-2.5 rounded text-[11px] space-y-1">
                  <div><b>กำหนดชำระ:</b> {dueDateText}</div>
                  <div><b>ช่องทางชำระเงิน:</b> {paymentInfo}</div>
                </div>

                <div className="bg-slate-100 p-2.5 rounded flex justify-between items-center font-black text-sm border border-slate-400">
                  <span>ยอดรวมที่ต้องชำระ:</span>
                  <span className="text-base font-mono">฿{formatNumber(rec.totalAmount)}</span>
                </div>

                <div className="pt-6 grid grid-cols-2 gap-10 text-xs text-center">
                  <div>
                    <div className="border-b border-slate-400 h-8 mb-1"></div>
                    <span>เจ้าหน้าที่ผู้ตรวจสอบ</span>
                  </div>
                  <div>
                    <div className="border-b border-slate-400 h-8 mb-1"></div>
                    <span>ผู้รับใบแจ้งหนี้</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
