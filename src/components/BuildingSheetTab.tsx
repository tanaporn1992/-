import React, { useState } from 'react';
import { Printer, Edit3, Camera, AlertTriangle, TrendingUp, Filter, X, FileText, Megaphone } from 'lucide-react';
import { RoomDefinition, MeterRecord, BuildingConfig } from '../types';
import { formatNumber, formatMonthThai, getShortMonthYear, getPrevShortMonthYear } from '../data/dormData';

interface BuildingSheetTabProps {
  masterRooms: RoomDefinition[];
  records: Record<string, MeterRecord>;
  selectedMonth: string;
  buildings: BuildingConfig[];
  onOpenRecordModal: (room: RoomDefinition) => void;
  onUpdateRecord: (roomId: string, partial: Partial<MeterRecord>) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const BuildingSheetTab: React.FC<BuildingSheetTabProps> = ({
  masterRooms,
  records,
  selectedMonth,
  buildings,
  onOpenRecordModal,
  onUpdateRecord,
}) => {
  const [activeBuildingId, setActiveBuildingId] = useState<string>(buildings[0]?.id || 'thachana');
  const [filterHighExpenseOnly, setFilterHighExpenseOnly] = useState<boolean>(false);
  const [slipToPrint, setSlipToPrint] = useState<MeterRecord | null>(null);
  const activeBuilding = buildings.find((b) => b.id === activeBuildingId) || buildings[0];

  const currentRooms = masterRooms.filter((r) => r.buildingId === activeBuildingId);

  // Rows data
  const rows = currentRooms.map((room) => {
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

  // Calculate building average of rooms with records and positive cost
  const recordedRoomsWithCost = rows.filter((r) => r.hasRecord && r.totalAmount > 0);
  const avgTotalAmount = recordedRoomsWithCost.length > 0
    ? recordedRoomsWithCost.reduce((sum, r) => sum + r.totalAmount, 0) / recordedRoomsWithCost.length
    : 0;
  const highExpenseThreshold = avgTotalAmount * 1.20; // 20% above average

  const rowsWithHighAlert = rows.map((r) => {
    const isHighExpense = r.hasRecord && r.totalAmount > highExpenseThreshold && r.totalAmount > 0 && avgTotalAmount > 0;
    const percentAbove = isHighExpense ? Math.round(((r.totalAmount - avgTotalAmount) / avgTotalAmount) * 100) : 0;
    return {
      ...r,
      isHighExpense,
      percentAbove,
    };
  });

  const highRoomsCount = rowsWithHighAlert.filter((r) => r.isHighExpense).length;
  const displayRows = filterHighExpenseOnly
    ? rowsWithHighAlert.filter((r) => r.isHighExpense)
    : rowsWithHighAlert;

  const totals = rows.reduce(
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Top Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-700">Official Dormitory Ledger</span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500">ประจำเดือน {formatMonthThai(selectedMonth)}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              ตารางสรุปจดมิเตอร์และแจ้งหนี้รายอาคาร (รูปแบบเอกสารราชการ)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ตารางคู่ขนานแสดงเลขมิเตอร์น้ำ-ไฟ จำนวนที่ใช้ และยอดเงินรวม ตรงตามเอกสารของหอพัก
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold transition-colors shadow-xs"
              title="พิมพ์เอกสารสรุปค่าน้ำ-ค่าไฟฟ้าทั้งอาคาร A4 สำหรับติดบอร์ดประชาสัมพันธ์"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>พิมพ์ประกาศติดบอร์ดอาคารนี้ (A4/PDF)</span>
            </button>
          </div>
        </div>

        {/* Building Selector Buttons */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            เลือกอาคาร:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {buildings.map((b) => {
              const bRooms = masterRooms.filter((r) => r.buildingId === b.id);
              const bRecorded = bRooms.filter((r) => !!records[r.id]).length;
              return (
                <button
                  key={b.id}
                  onClick={() => setActiveBuildingId(b.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    activeBuildingId === b.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{b.name}</span>
                  <span className="text-[10px] opacity-80 tabular-nums">
                    ({bRecorded}/{bRooms.length})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 20% High Expense Alert & KPI Strip */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 text-slate-600">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="text-slate-400">ค่าเฉลี่ยปกติอาคารนี้:</span>
              <b className="text-slate-900 font-mono">฿{formatNumber(Math.round(avgTotalAmount))}</b>
              <span className="text-slate-400">/ ห้อง</span>
            </span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="text-slate-400">เกณฑ์เตือนสูงกว่า 20%:</span>
              <b className="text-rose-700 font-mono">&gt; ฿{formatNumber(Math.round(highExpenseThreshold))}</b>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {highRoomsCount > 0 ? (
              <button
                onClick={() => setFilterHighExpenseOnly(!filterHighExpenseOnly)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                  filterHighExpenseOnly
                    ? 'bg-rose-600 text-white ring-2 ring-rose-400'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                }`}
                title="คลิกเพื่อกรองดูเฉพาะห้องที่ค่าใช้จ่ายสูงเกินเกณฑ์ 20%"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>
                  {filterHighExpenseOnly ? 'แสดงห้องทั้งหมด' : `แจ้งเตือน: ค่าใช้จ่ายสูงผิดปกติ (${highRoomsCount} ห้อง)`}
                </span>
              </button>
            ) : (
              <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1">
                <span>ทุกห้องอยู่ในเกณฑ์ปกติ (ไม่เกิน +20%)</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Screen Interactive Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {/* Table Banner */}
        <div className="px-4 py-3 bg-slate-900 text-white flex flex-col sm:flex-row justify-between items-center text-xs gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sky-400">หอพัก{activeBuilding.name}</span>
            <span className="text-slate-400">·</span>
            <span>ประจำเดือน {formatMonthThai(selectedMonth)}</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-300 font-mono">({filterHighExpenseOnly ? `${displayRows.length}/${currentRooms.length}` : `${currentRooms.length}`} ห้อง)</span>
            {filterHighExpenseOnly && (
              <span className="bg-rose-500/20 text-rose-300 border border-rose-400/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                กรองเฉพาะห้องสูงเกินค่าเฉลี่ย 20%
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400">
            * คลิกที่เลขห้องเพื่อเปิดหน้าต่างแก้ไข หรือพิมพ์หมายเหตุลงในตารางได้โดยตรง
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
              <tr>
                <th rowSpan={2} className="p-2.5 border border-slate-300 w-20 bg-slate-200/60">
                  ห้อง
                </th>
                <th colSpan={3} className="p-2 border border-slate-300 bg-sky-50 text-sky-900">
                  เลขมิเตอร์ค่าน้ำประปา
                </th>
                <th colSpan={3} className="p-2 border border-slate-300 bg-amber-50 text-amber-900">
                  เลขมิเตอร์ค่าไฟฟ้า
                </th>
                <th colSpan={3} className="p-2 border border-slate-300 bg-emerald-50 text-emerald-900">
                  จำนวนเงิน (บาท)
                </th>
                <th rowSpan={2} className="p-2.5 border border-slate-300 min-w-[150px]">
                  หมายเหตุ / ลายมือชื่อ
                </th>
                <th rowSpan={2} className="p-2.5 border border-slate-300 w-24 no-print text-center">
                  สลิป / ภาพ
                </th>
              </tr>
              <tr>
                {/* Water headers */}
                <th className="p-2 border border-slate-300 bg-sky-50/50 text-slate-700 w-24">
                  <span className="block text-[10px] text-sky-800 font-extrabold uppercase">เลขตั้งต้น</span>
                  <span>{getPrevShortMonthYear(selectedMonth)}</span>
                </th>
                <th className="p-2 border border-slate-300 bg-sky-50/50 text-slate-700 w-24">
                  <span className="block text-[10px] text-sky-800 font-extrabold uppercase">เลขจดใหม่</span>
                  <span>{getShortMonthYear(selectedMonth)}</span>
                </th>
                <th className="p-2 border border-slate-300 bg-sky-50/50 text-slate-700 w-16">จำนวนใช้</th>

                {/* Elec headers */}
                <th className="p-2 border border-slate-300 bg-amber-50/50 text-slate-700 w-24">
                  <span className="block text-[10px] text-amber-800 font-extrabold uppercase">เลขตั้งต้น</span>
                  <span>{getPrevShortMonthYear(selectedMonth)}</span>
                </th>
                <th className="p-2 border border-slate-300 bg-amber-50/50 text-slate-700 w-24">
                  <span className="block text-[10px] text-amber-800 font-extrabold uppercase">เลขจดใหม่</span>
                  <span>{getShortMonthYear(selectedMonth)}</span>
                </th>
                <th className="p-2 border border-slate-300 bg-amber-50/50 text-slate-700 w-16">จำนวนใช้</th>

                {/* Amount headers */}
                <th className="p-2 border border-slate-300 bg-emerald-50/50 text-slate-700 w-20">ค่าน้ำประปา</th>
                <th className="p-2 border border-slate-300 bg-emerald-50/50 text-slate-700 w-20">ค่าไฟฟ้า</th>
                <th className="p-2 border border-slate-300 bg-emerald-50/50 text-slate-700 w-28">รวมเงิน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {displayRows.map((r) => (
                <tr
                  key={r.room.id}
                  className={`transition-colors ${
                    r.isHighExpense ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Room number */}
                  <td
                    onClick={() => onOpenRecordModal(r.room)}
                    className={`p-2 font-bold border border-slate-200 cursor-pointer transition-colors ${
                      r.isHighExpense
                        ? 'bg-rose-100/70 text-rose-950 hover:bg-rose-200/80'
                        : 'bg-slate-50/60 text-slate-900 hover:bg-sky-100 hover:text-sky-900'
                    }`}
                    title="คลิกเพื่อแก้ไขมิเตอร์ห้องนี้"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>{r.room.roomNo}</span>
                      {r.isHighExpense && (
                        <span
                          className="text-rose-600 animate-pulse"
                          title={`แจ้งเตือน: ค่าใช้จ่ายสูงกว่าค่าเฉลี่ยปกติ ${r.percentAbove}% (ยอด ฿${formatNumber(r.totalAmount)} / เฉลี่ยอาคาร ฿${formatNumber(Math.round(avgTotalAmount))})`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5 fill-rose-100" />
                        </span>
                      )}
                      <Edit3 className="w-2.5 h-2.5 opacity-40 hover:opacity-100 no-print" />
                    </div>
                  </td>

                  {/* Water meter */}
                  <td className="p-2 border border-slate-200 text-slate-600 font-mono tabular-nums">
                    {r.hasRecord ? (r.room.waterType === 'flat_per_person' ? '-' : r.waterPrev) : '-'}
                  </td>
                  <td className="p-2 border border-slate-200 text-slate-900 font-mono font-medium tabular-nums">
                    {r.hasRecord
                      ? r.room.waterType === 'flat_per_person'
                        ? `${r.occupants} คน`
                        : r.waterCurr
                      : '-'}
                  </td>
                  <td className="p-2 border border-slate-200 font-bold text-sky-800 bg-sky-50/20 font-mono tabular-nums">
                    {r.hasRecord ? (r.room.waterType === 'flat_per_person' ? '-' : r.waterUnits) : '-'}
                  </td>

                  {/* Electricity meter */}
                  <td className="p-2 border border-slate-200 text-slate-600 font-mono tabular-nums">
                    {r.hasRecord ? r.elecPrev : '-'}
                  </td>
                  <td className="p-2 border border-slate-200 text-slate-900 font-mono font-medium tabular-nums">
                    {r.hasRecord ? r.elecCurr : '-'}
                  </td>
                  <td className="p-2 border border-slate-200 font-bold text-amber-800 bg-amber-50/20 font-mono tabular-nums">
                    {r.hasRecord ? r.elecUnits : '-'}
                  </td>

                  {/* Amounts */}
                  <td className="p-2 border border-slate-200 text-right font-medium text-slate-800 tabular-nums">
                    {r.hasRecord ? formatNumber(r.waterCost) : '-'}
                  </td>
                  <td className="p-2 border border-slate-200 text-right font-medium text-slate-800 tabular-nums">
                    {r.hasRecord ? formatNumber(r.elecCost) : '-'}
                  </td>
                  <td
                    className={`p-2 border border-slate-200 text-right font-extrabold tabular-nums ${
                      r.isHighExpense
                        ? 'bg-rose-100/60 text-rose-950 border-rose-300 font-black'
                        : 'text-slate-900 bg-emerald-50/20'
                    }`}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      {r.isHighExpense && (
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-rose-200/90 text-rose-900 text-[10px] font-bold shrink-0"
                          title={`ค่าใช้จ่ายสูงกว่าค่าเฉลี่ยปกติ ${r.percentAbove}%`}
                        >
                          <AlertTriangle className="w-2.5 h-2.5 text-rose-700" />
                          <span>+{r.percentAbove}%</span>
                        </span>
                      )}
                      <span>{r.hasRecord ? formatNumber(r.totalAmount) : '-'}</span>
                    </div>
                  </td>

                  {/* Editable remarks */}
                  <td className="p-1 border border-slate-200 text-left">
                    <input
                      type="text"
                      value={r.remark}
                      onChange={(e) => onUpdateRecord(r.room.id, { remark: e.target.value })}
                      placeholder="ระบุหมายเหตุ..."
                      className="w-full bg-transparent px-2 py-1 text-xs focus:bg-amber-50 focus:outline-none rounded text-slate-700"
                    />
                  </td>

                  {/* Slip print & Photo status (no print) */}
                  <td className="p-1 border border-slate-200 text-center no-print">
                    <div className="flex items-center justify-center gap-1.5">
                      {r.hasRecord ? (
                        <button
                          onClick={() => setSlipToPrint(r.rec)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded bg-sky-50 hover:bg-sky-100 text-sky-800 text-[10px] font-bold border border-sky-200 transition-colors"
                          title="พิมพ์สลิปใบแจ้งหนี้ห้องนี้"
                        >
                          <Printer className="w-3 h-3 text-sky-700" />
                          <span>สลิป</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-300">-</span>
                      )}
                      <div className="flex items-center gap-0.5">
                        {r.rec?.waterPhoto && (
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" title="มีภาพมิเตอร์น้ำ" />
                        )}
                        {r.rec?.elecPhoto && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="มีภาพมิเตอร์ไฟ" />
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Totals Row */}
            <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
              <tr>
                <td className="p-2.5 border border-slate-300">รวมเงิน</td>
                <td colSpan={2} className="p-2.5 border border-slate-300 text-slate-500"></td>
                <td className="p-2.5 border border-slate-300 text-sky-900 font-black tabular-nums">
                  {formatNumber(totals.waterUnits)}
                </td>
                <td colSpan={2} className="p-2.5 border border-slate-300 text-slate-500"></td>
                <td className="p-2.5 border border-slate-300 text-amber-900 font-black tabular-nums">
                  {formatNumber(totals.elecUnits)}
                </td>
                <td className="p-2.5 border border-slate-300 text-right text-sky-900 tabular-nums">
                  {formatNumber(totals.waterCost)}
                </td>
                <td className="p-2.5 border border-slate-300 text-right text-amber-900 tabular-nums">
                  {formatNumber(totals.elecCost)}
                </td>
                <td className="p-2.5 border border-slate-300 text-right text-emerald-950 font-black text-sm tabular-nums">
                  {formatNumber(totals.totalAmount)}
                </td>
                <td className="p-2.5 border border-slate-300"></td>
                <td className="p-2.5 border border-slate-300 no-print"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* PRINT-ONLY OFFICIAL FORMAT: Exactly matches user's PDF pages */}
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

          {/* Bulletin Board Notice Header */}
          <div className="border-2 border-slate-900 p-2.5 rounded mb-3 text-xs bg-slate-50 text-left">
            <div className="font-bold flex items-center gap-1 mb-1">
              <span>📌 ประกาศสำคัญถึงผู้พักอาศัย:</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div><b>กำหนดชำระเงินภายใน:</b> วันที่ 5 ของเดือนถัดไป (08.30 - 16.30 น.)</div>
              <div><b>ช่องทางชำระเงิน:</b> ธ.กรุงไทย บัญชี 987-6-54321-0 (กองทุนหอพักนักศึกษา) หรือสแกน QR Code หน้าสำนักงาน</div>
            </div>
          </div>

          <table className="w-full text-center text-xs print-table">
            <thead>
              <tr className="bg-slate-100">
                <th rowSpan={2} className="py-1.5 px-1 w-12">
                  ห้อง
                </th>
                <th colSpan={3} className="py-1 px-1">
                  เลขมิเตอร์ค่าน้ำประปา
                </th>
                <th colSpan={3} className="py-1 px-1">
                  เลขมิเตอร์ค่าไฟฟ้า
                </th>
                <th colSpan={3} className="py-1 px-1">
                  จำนวนเงิน (บาท)
                </th>
                <th rowSpan={2} className="py-1.5 px-1 w-28">
                  หมายเหตุ / ลายมือชื่อ
                </th>
              </tr>
              <tr className="bg-slate-100">
                <th className="py-1 px-1 w-14">ตั้งต้น ({getPrevShortMonthYear(selectedMonth)})</th>
                <th className="py-1 px-1 w-14">ใหม่ ({getShortMonthYear(selectedMonth)})</th>
                <th className="py-1 px-1 w-12">จำนวนใช้</th>
                <th className="py-1 px-1 w-14">ตั้งต้น ({getPrevShortMonthYear(selectedMonth)})</th>
                <th className="py-1 px-1 w-14">ใหม่ ({getShortMonthYear(selectedMonth)})</th>
                <th className="py-1 px-1 w-12">จำนวนใช้</th>
                <th className="py-1 px-1 w-16">ค่าน้ำประปา</th>
                <th className="py-1 px-1 w-16">ค่าไฟฟ้า</th>
                <th className="py-1 px-1 w-16">รวมเงิน</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.room.id}>
                  <td className="py-1 px-1 font-bold">{r.room.roomNo}</td>
                  {/* Water */}
                  <td className="py-1 px-1">
                    {r.hasRecord ? (r.room.waterType === 'flat_per_person' ? '-' : r.waterPrev) : ''}
                  </td>
                  <td className="py-1 px-1">
                    {r.hasRecord
                      ? r.room.waterType === 'flat_per_person'
                        ? `${r.occupants} คน`
                        : r.waterCurr
                      : ''}
                  </td>
                  <td className="py-1 px-1 font-semibold">
                    {r.hasRecord ? (r.room.waterType === 'flat_per_person' ? '0' : r.waterUnits) : ''}
                  </td>

                  {/* Elec */}
                  <td className="py-1 px-1">{r.hasRecord ? r.elecPrev : ''}</td>
                  <td className="py-1 px-1">{r.hasRecord ? r.elecCurr : ''}</td>
                  <td className="py-1 px-1 font-semibold">{r.hasRecord ? r.elecUnits : ''}</td>

                  {/* Amount */}
                  <td className="py-1 px-1 text-right">{r.hasRecord ? formatNumber(r.waterCost) : ''}</td>
                  <td className="py-1 px-1 text-right">{r.hasRecord ? formatNumber(r.elecCost) : ''}</td>
                  <td className="py-1 px-1 text-right font-bold">
                    {r.hasRecord ? formatNumber(r.totalAmount) : ''}
                  </td>

                  {/* Remark */}
                  <td className="py-1 px-1 text-left text-[11px]">{r.remark || ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="font-bold">
              <tr>
                <td className="py-1.5 px-1">รวมเงิน</td>
                <td colSpan={2} className="py-1 px-1"></td>
                <td className="py-1 px-1">{formatNumber(totals.waterUnits)}</td>
                <td colSpan={2} className="py-1 px-1"></td>
                <td className="py-1 px-1">{formatNumber(totals.elecUnits)}</td>
                <td className="py-1 px-1 text-right">{formatNumber(totals.waterCost)}</td>
                <td className="py-1 px-1 text-right">{formatNumber(totals.elecCost)}</td>
                <td className="py-1 px-1 text-right font-black">{formatNumber(totals.totalAmount)}</td>
                <td className="py-1 px-1"></td>
              </tr>
            </tfoot>
          </table>

          {/* Signatures on Paper */}
          <div className="pt-4 space-y-4 text-xs">
            <div className="text-[10px] text-slate-700 italic">
              * ติดต่อสอบถามหรือแจ้งข้อผิดพลาด: สำนักงานหอพัก โทร 081-234-5678 (ภายใน 3 วันทำการ)
            </div>
            <div className="grid grid-cols-2 gap-8 pt-4">
              <div className="space-y-6 text-center">
                <p className="text-[10px] text-slate-600">เจ้าหน้าที่ผู้ตรวจสอบ</p>
                <div className="border-b border-slate-400 w-44 mx-auto"></div>
                <p className="font-semibold">(........................................................)</p>
              </div>
              <div className="space-y-6 text-center">
                <p className="text-[10px] text-slate-600">เจ้าหน้าที่บริหารจัดการหอพักนักศึกษา</p>
                <div className="border-b border-slate-400 w-44 mx-auto"></div>
                <p className="font-semibold">(........................................................)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Slip Modal When Clicked on a Row in BuildingSheetTab */}
      {slipToPrint && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 no-print animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-xs text-sky-400 font-bold uppercase tracking-wider">{slipToPrint.buildingName}</span>
                <h3 className="text-lg font-bold">สลิปใบแจ้งหนี้ ห้อง {slipToPrint.roomNo}</h3>
              </div>
              <button
                onClick={() => setSlipToPrint(null)}
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
                      {slipToPrint.waterType === 'flat_per_person'
                        ? `${slipToPrint.occupants || 1} คน (เหมา)`
                        : `${slipToPrint.waterUnits} หน่วย`}
                    </td>
                    <td className="p-2 text-right font-bold text-sky-800 font-mono">
                      ฿{formatNumber(slipToPrint.waterCost)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">ค่าไฟฟ้า</td>
                    <td className="p-2 text-center font-mono">{slipToPrint.elecUnits} หน่วย</td>
                    <td className="p-2 text-right font-bold text-amber-800 font-mono">
                      ฿{formatNumber(slipToPrint.elecCost)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {slipToPrint.remark && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px]">
                  <b>หมายเหตุ:</b> {slipToPrint.remark}
                </div>
              )}

              <div className="p-3.5 bg-slate-900 text-white rounded-xl flex justify-between items-center font-bold">
                <span className="text-slate-300">ยอดรวมชำระทั้งสิ้น:</span>
                <span className="text-xl text-amber-400 font-black font-mono">
                  ฿{formatNumber(slipToPrint.totalAmount)}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setSlipToPrint(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-semibold"
                >
                  ปิด
                </button>
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-4 h-4 text-amber-300" />
                  <span>พิมพ์สลิปห้องนี้ (PDF)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
