import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Droplets,
  Zap,
  AlertTriangle,
  Sparkles,
  Printer,
  Coins,
  CheckCircle2,
  Building,
  Info,
  ArrowUpRight,
} from 'lucide-react';
import { RoomDefinition, MeterRecord, BuildingConfig, MonthlyAnalytics } from '../types';
import { formatNumber, formatMonthThai } from '../data/dormData';

interface AutoExpenseAnalyticsTabProps {
  masterRooms: RoomDefinition[];
  records: Record<string, MeterRecord>;
  selectedMonth: string;
  buildings: BuildingConfig[];
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const AutoExpenseAnalyticsTab: React.FC<AutoExpenseAnalyticsTabProps> = ({
  masterRooms,
  records,
  selectedMonth,
  buildings,
  showToast,
}) => {
  const [aiAnalysisText, setAiAnalysisText] = useState<string | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  // Compute rich analytics
  const analytics: MonthlyAnalytics = useMemo(() => {
    const totalRooms = masterRooms.length;
    const recordedList = Object.values(records);
    const recordedCount = recordedList.length;

    let totalWaterUnits = 0;
    let totalWaterCost = 0;
    let totalElecUnits = 0;
    let totalElecCost = 0;
    let totalRevenue = 0;

    const highWaterAlerts: MeterRecord[] = [];
    const highElecAlerts: MeterRecord[] = [];

    recordedList.forEach((r) => {
      totalWaterUnits += r.waterUnits || 0;
      totalWaterCost += r.waterCost || 0;
      totalElecUnits += r.elecUnits || 0;
      totalElecCost += r.elecCost || 0;
      totalRevenue += r.totalAmount || 0;

      // Detect anomalies
      if (r.waterUnits >= 15) {
        highWaterAlerts.push(r);
      }
      if (r.elecUnits >= 200) {
        highElecAlerts.push(r);
      }
    });

    // Sort alerts by highest consumption
    highWaterAlerts.sort((a, b) => b.waterUnits - a.waterUnits);
    highElecAlerts.sort((a, b) => b.elecUnits - a.elecUnits);

    const completionRate = totalRooms > 0 ? (recordedCount / totalRooms) * 100 : 0;
    const avgCostPerRoom = recordedCount > 0 ? totalRevenue / recordedCount : 0;

    return {
      totalRooms,
      recordedCount,
      completionRate,
      totalWaterUnits,
      totalWaterCost,
      totalElecUnits,
      totalElecCost,
      totalRevenue,
      avgCostPerRoom,
      highWaterAlerts,
      highElecAlerts,
    };
  }, [masterRooms, records]);

  // Breakdown by Building
  const buildingBreakdown = useMemo(() => {
    return buildings.map((b) => {
      const bRooms = masterRooms.filter((r) => r.buildingId === b.id);
      const total = bRooms.length;
      let recorded = 0;
      let waterUnits = 0;
      let waterCost = 0;
      let elecUnits = 0;
      let elecCost = 0;
      let totalAmount = 0;

      bRooms.forEach((room) => {
        const rec = records[room.id];
        if (rec) {
          recorded++;
          waterUnits += rec.waterUnits || 0;
          waterCost += rec.waterCost || 0;
          elecUnits += rec.elecUnits || 0;
          elecCost += rec.elecCost || 0;
          totalAmount += rec.totalAmount || 0;
        }
      });

      const avgPerRoom = recorded > 0 ? totalAmount / recorded : 0;

      return {
        id: b.id,
        name: b.name,
        total,
        recorded,
        waterUnits,
        waterCost,
        elecUnits,
        elecCost,
        totalAmount,
        avgPerRoom,
      };
    });
  }, [buildings, masterRooms, records]);

  // Trigger Gemini AI Executive Analysis
  const handleGenerateAiAnalysis = async () => {
    setIsAiAnalyzing(true);
    try {
      const payload = {
        month: selectedMonth,
        totalRooms: analytics.totalRooms,
        recordedRooms: analytics.recordedCount,
        totalRevenue: analytics.totalRevenue,
        totalWaterUnits: analytics.totalWaterUnits,
        totalWaterCost: analytics.totalWaterCost,
        totalElecUnits: analytics.totalElecUnits,
        totalElecCost: analytics.totalElecCost,
        topWaterConsumers: analytics.highWaterAlerts.slice(0, 5).map((r) => ({
          building: r.buildingName,
          room: r.roomNo,
          waterUnits: r.waterUnits,
          remark: r.remark,
        })),
        topElecConsumers: analytics.highElecAlerts.slice(0, 5).map((r) => ({
          building: r.buildingName,
          room: r.roomNo,
          elecUnits: r.elecUnits,
          remark: r.remark,
        })),
        buildingBreakdown: buildingBreakdown.map((b) => ({
          name: b.name,
          recorded: b.recorded,
          total: b.total,
          totalAmount: b.totalAmount,
        })),
      };

      const response = await fetch('/api/analyze-expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success && data.analysis) {
        setAiAnalysisText(data.analysis);
        showToast('สร้างรายงานวิเคราะห์ค่าใช้จ่ายด้วย AI สำเร็จ');
      } else {
        // Fallback analysis text if API key not supplied
        const fallback = `สรุปภาพรวมค่าใช้จ่ายประจำเดือน ${formatMonthThai(selectedMonth)}:
- ยอดเรียกเก็บค่าน้ำ-ค่าไฟฟ้ารวมทั้งสิ้น: ฿${formatNumber(analytics.totalRevenue)}
- ค่าน้ำประปารวม: ฿${formatNumber(analytics.totalWaterCost)} (${formatNumber(analytics.totalWaterUnits)} หน่วย)
- ค่าไฟฟ้ารวม: ฿${formatNumber(analytics.totalElecCost)} (${formatNumber(analytics.totalElecUnits)} หน่วย)
- อัตราการบันทึกสำเร็จ: ${analytics.completionRate.toFixed(1)}% (${analytics.recordedCount}/${analytics.totalRooms} ห้อง)

ข้อสังเกต:
- พบห้องที่ใช้น้ำเกิน 15 หน่วย จำนวน ${analytics.highWaterAlerts.length} ห้อง ควรตรวจสอบสุขภัณฑ์และสายชำระเพื่อป้องกันการรั่วซึม
- พบห้องที่ใช้ไฟฟ้าเกิน 200 หน่วย จำนวน ${analytics.highElecAlerts.length} ห้อง ซึ่งเป็นกลุ่มห้องที่มีการใช้โหลดกำลังไฟสูง`;
        setAiAnalysisText(fallback);
        showToast('สรุปรายงานการวิเคราะห์เสร็จสิ้น');
      }
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาดในการวิเคราะห์ AI: ' + err.message, 'error');
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header and Print Control */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Automated Financial Engine</span>
            <span className="text-slate-300">·</span>
            <span className="text-xs text-slate-500">ประจำเดือน {formatMonthThai(selectedMonth)}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            รายงานคำนวณและวิเคราะห์ค่าใช้จ่ายรายเดือนอัตโนมัติ
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            คำนวณค่าน้ำ-ไฟฟ้าอัตโนมัติ ตรวจสอบท่อรั่วและไฟฟ้ารั่วซึม พร้อมสถิติเปรียบเทียบทั้ง 8 อาคาร
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleGenerateAiAnalysis}
            disabled={isAiAnalyzing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors shadow-xs disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isAiAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAiAnalyzing ? 'กำลังประมวลผล AI...' : 'วิเคราะห์ผู้บริหารด้วย AI'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์รายงานสรุป (A4)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>รายได้ค่าสาธารณูปโภครวม</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black tabular-nums tracking-tight text-white">
              ฿{formatNumber(analytics.totalRevenue)}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <span>เฉลี่ย ฿{formatNumber(analytics.avgCostPerRoom)} / ห้อง</span>
            </div>
          </div>
        </div>

        {/* Water Stats */}
        <div className="bg-sky-50/70 border border-sky-200 p-5 rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-sky-800">
            <span>ค่าน้ำประปารวม</span>
            <Droplets className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black tabular-nums tracking-tight text-sky-950">
              ฿{formatNumber(analytics.totalWaterCost)}
            </div>
            <div className="text-xs text-sky-700 mt-1 flex items-center justify-between">
              <span>ปริมาณน้ำที่ใช้:</span>
              <span className="font-bold tabular-nums">{formatNumber(analytics.totalWaterUnits)} หน่วย (m³)</span>
            </div>
          </div>
        </div>

        {/* Electricity Stats */}
        <div className="bg-amber-50/70 border border-amber-200 p-5 rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
            <span>ค่าไฟฟ้ารวม</span>
            <Zap className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black tabular-nums tracking-tight text-amber-950">
              ฿{formatNumber(analytics.totalElecCost)}
            </div>
            <div className="text-xs text-amber-700 mt-1 flex items-center justify-between">
              <span>ปริมาณไฟที่ใช้:</span>
              <span className="font-bold tabular-nums">{formatNumber(analytics.totalElecUnits)} หน่วย (kWh)</span>
            </div>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-emerald-50/70 border border-emerald-200 p-5 rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
            <span>ความคืบหน้าการจดบันทึก</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black tabular-nums tracking-tight text-emerald-950">
              {analytics.completionRate.toFixed(1)}%
            </div>
            <div className="text-xs text-emerald-700 mt-1 flex items-center justify-between">
              <span>บันทึกแล้ว:</span>
              <span className="font-bold tabular-nums">
                {analytics.recordedCount} / {analytics.totalRooms} ห้อง
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Executive Analysis Panel */}
      {aiAnalysisText && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border border-slate-700 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-700 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-sm tracking-wide">บทวิเคราะห์ผู้บริหารและข้อเสนอแนะเชิงรุก (AI Executive Brief)</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Gemini 3.8 Flash Analysis</span>
          </div>
          <div className="text-xs leading-relaxed text-slate-200 whitespace-pre-line font-sans">
            {aiAnalysisText}
          </div>
        </div>
      )}

      {/* Anomaly & Risk Alerts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Water Leak Alert */}
        <div className="bg-white border border-sky-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-sky-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-sky-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                แจ้งเตือน: ห้องที่ใช้น้ำสูงผิดปกติ ({'>='} 15 หน่วย)
              </h3>
            </div>
            <span className="text-xs font-semibold text-sky-700 tabular-nums">
              {analytics.highWaterAlerts.length} ห้อง
            </span>
          </div>

          <div className="mt-3 divide-y divide-slate-100 max-h-48 overflow-y-auto text-xs">
            {analytics.highWaterAlerts.map((r) => (
              <div key={r.roomId} className="py-2 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900">ห้อง {r.roomNo}</span>
                  <span className="text-slate-400 text-[11px] ml-1.5">({r.buildingName})</span>
                  {r.remark && (
                    <span className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      {r.remark}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-bold text-sky-700 tabular-nums">{r.waterUnits} หน่วย</span>
                  <span className="text-slate-400 text-[11px] ml-1.5">(฿{formatNumber(r.waterCost)})</span>
                </div>
              </div>
            ))}
            {analytics.highWaterAlerts.length === 0 && (
              <div className="py-6 text-center text-slate-400 text-xs">
                ไม่มีห้องที่ใช้น้ำเกินเกณฑ์ปกติ (ระบบน้ำประปาปกติ)
              </div>
            )}
          </div>
        </div>

        {/* High Electricity Consumption Alert */}
        <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-amber-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                แจ้งเตือน: ห้องที่ใช้ไฟฟ้าสูง ({'>='} 200 หน่วย)
              </h3>
            </div>
            <span className="text-xs font-semibold text-amber-700 tabular-nums">
              {analytics.highElecAlerts.length} ห้อง
            </span>
          </div>

          <div className="mt-3 divide-y divide-slate-100 max-h-48 overflow-y-auto text-xs">
            {analytics.highElecAlerts.map((r) => (
              <div key={r.roomId} className="py-2 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900">ห้อง {r.roomNo}</span>
                  <span className="text-slate-400 text-[11px] ml-1.5">({r.buildingName})</span>
                  {r.remark && (
                    <span className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      {r.remark}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-bold text-amber-700 tabular-nums">{r.elecUnits} หน่วย</span>
                  <span className="text-slate-400 text-[11px] ml-1.5">(฿{formatNumber(r.elecCost)})</span>
                </div>
              </div>
            ))}
            {analytics.highElecAlerts.length === 0 && (
              <div className="py-6 text-center text-slate-400 text-xs">
                ไม่มีห้องที่ใช้ไฟฟ้าสูงเกินเกณฑ์
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Building-by-Building Comparison Matrix */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-600" />
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide">
              ตารางเปรียบเทียบค่าใช้จ่ายรายอาคาร ประจำเดือน {formatMonthThai(selectedMonth)}
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">รวม 8 อาคารที่พักอาศัย</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">ชื่ออาคาร</th>
                <th className="p-3 text-center">จดบันทึก/ทั้งหมด</th>
                <th className="p-3 text-right">หน่วยน้ำ (m³)</th>
                <th className="p-3 text-right">ค่าน้ำ (บาท)</th>
                <th className="p-3 text-right">หน่วยไฟ (kWh)</th>
                <th className="p-3 text-right">ค่าไฟ (บาท)</th>
                <th className="p-3 text-right">รวมเงิน (บาท)</th>
                <th className="p-3 text-right">เฉลี่ยต่อห้อง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {buildingBreakdown.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-900">{b.name}</td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        b.recorded === b.total
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {b.recorded}/{b.total} ห้อง
                    </span>
                  </td>
                  <td className="p-3 text-right tabular-nums">{formatNumber(b.waterUnits)}</td>
                  <td className="p-3 text-right font-medium text-sky-800 tabular-nums">
                    ฿{formatNumber(b.waterCost)}
                  </td>
                  <td className="p-3 text-right tabular-nums">{formatNumber(b.elecUnits)}</td>
                  <td className="p-3 text-right font-medium text-amber-800 tabular-nums">
                    ฿{formatNumber(b.elecCost)}
                  </td>
                  <td className="p-3 text-right font-extrabold text-slate-900 tabular-nums text-sm">
                    ฿{formatNumber(b.totalAmount)}
                  </td>
                  <td className="p-3 text-right text-slate-500 tabular-nums">
                    ฿{formatNumber(b.avgPerRoom)}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Totals Row */}
            <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
              <tr>
                <td className="p-3">รวมทุกอาคาร</td>
                <td className="p-3 text-center tabular-nums">
                  {analytics.recordedCount}/{analytics.totalRooms} ห้อง
                </td>
                <td className="p-3 text-right text-sky-900 tabular-nums">
                  {formatNumber(analytics.totalWaterUnits)}
                </td>
                <td className="p-3 text-right text-sky-900 tabular-nums">
                  ฿{formatNumber(analytics.totalWaterCost)}
                </td>
                <td className="p-3 text-right text-amber-900 tabular-nums">
                  {formatNumber(analytics.totalElecUnits)}
                </td>
                <td className="p-3 text-right text-amber-900 tabular-nums">
                  ฿{formatNumber(analytics.totalElecCost)}
                </td>
                <td className="p-3 text-right text-emerald-900 font-black text-sm tabular-nums">
                  ฿{formatNumber(analytics.totalRevenue)}
                </td>
                <td className="p-3 text-right tabular-nums">
                  ฿{formatNumber(analytics.avgCostPerRoom)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* PRINT-ONLY OFFICIAL SUMMARY SHEET */}
      <div className="print-only">
        <div className="p-6 max-w-4xl mx-auto font-sans">
          <div className="text-center pb-4 border-b-2 border-slate-900 mb-6">
            <h1 className="text-xl font-black">รายงานสรุปการคำนวณค่าสาธารณูปโภคประจำเดือน</h1>
            <p className="text-xs text-slate-600">ประจำเดือน {formatMonthThai(selectedMonth)}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center my-6">
            <div className="border border-slate-400 p-3 rounded">
              <span className="text-xs text-slate-600 block">รายได้ค่าน้ำประปารวม</span>
              <span className="text-base font-bold">฿{formatNumber(analytics.totalWaterCost)}</span>
              <span className="text-[10px] text-slate-500 block">({formatNumber(analytics.totalWaterUnits)} หน่วย)</span>
            </div>
            <div className="border border-slate-400 p-3 rounded">
              <span className="text-xs text-slate-600 block">รายได้ค่าไฟฟ้ารวม</span>
              <span className="text-base font-bold">฿{formatNumber(analytics.totalElecCost)}</span>
              <span className="text-[10px] text-slate-500 block">({formatNumber(analytics.totalElecUnits)} หน่วย)</span>
            </div>
            <div className="border border-slate-900 bg-slate-100 p-3 rounded font-black">
              <span className="text-xs text-slate-700 block">ยอดรวมทั้งสิ้น</span>
              <span className="text-lg">฿{formatNumber(analytics.totalRevenue)}</span>
              <span className="text-[10px] text-slate-500 block font-normal">({analytics.recordedCount} ห้อง)</span>
            </div>
          </div>

          <table className="w-full text-left text-xs border-collapse my-6 print-table">
            <thead>
              <tr className="bg-slate-200 text-slate-900 font-bold">
                <th className="py-2 px-2">ชื่ออาคาร</th>
                <th className="py-2 px-2 text-center">จดเสร็จ</th>
                <th className="py-2 px-2 text-right">หน่วยน้ำ</th>
                <th className="py-2 px-2 text-right">ค่าน้ำ (บาท)</th>
                <th className="py-2 px-2 text-right">หน่วยไฟ</th>
                <th className="py-2 px-2 text-right">ค่าไฟ (บาท)</th>
                <th className="py-2 px-2 text-right">ยอดรวม (บาท)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {buildingBreakdown.map((b) => (
                <tr key={b.id}>
                  <td className="py-2 px-2 font-bold">{b.name}</td>
                  <td className="py-2 px-2 text-center">{b.recorded}/{b.total}</td>
                  <td className="py-2 px-2 text-right">{formatNumber(b.waterUnits)}</td>
                  <td className="py-2 px-2 text-right">฿{formatNumber(b.waterCost)}</td>
                  <td className="py-2 px-2 text-right">{formatNumber(b.elecUnits)}</td>
                  <td className="py-2 px-2 text-right">฿{formatNumber(b.elecCost)}</td>
                  <td className="py-2 px-2 text-right font-bold">฿{formatNumber(b.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="font-bold bg-slate-100">
              <tr>
                <td className="py-2 px-2">รวมเงิน</td>
                <td className="py-2 px-2 text-center">{analytics.recordedCount}/{analytics.totalRooms}</td>
                <td className="py-2 px-2 text-right">{formatNumber(analytics.totalWaterUnits)}</td>
                <td className="py-2 px-2 text-right">฿{formatNumber(analytics.totalWaterCost)}</td>
                <td className="py-2 px-2 text-right">{formatNumber(analytics.totalElecUnits)}</td>
                <td className="py-2 px-2 text-right">฿{formatNumber(analytics.totalElecCost)}</td>
                <td className="py-2 px-2 text-right font-black">฿{formatNumber(analytics.totalRevenue)}</td>
              </tr>
            </tfoot>
          </table>

          <div className="pt-12 grid grid-cols-2 gap-12 text-xs text-center">
            <div>
              <div className="border-b border-slate-400 h-10 mb-1"></div>
              <span>ผู้จัดทำรายงาน (เจ้าหน้าที่จดมิเตอร์)</span>
            </div>
            <div>
              <div className="border-b border-slate-400 h-10 mb-1"></div>
              <span>ผู้อนุมัติ (ผู้จัดการหอพัก)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
