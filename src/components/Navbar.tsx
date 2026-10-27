import React from 'react';
import { Calendar, PlusCircle, CheckCircle, Clock, Zap, BookOpen } from 'lucide-react';
import { formatNumber } from '../data/dormData';

export type ActiveTab = 'photoReport' | 'buildingSheet' | 'baseline' | 'analytics' | 'grid' | 'walkthrough' | 'invoices' | 'export';

interface NavbarProps {
  currentTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onOpenQuickWalkthrough: () => void;
  onOpenGuide: () => void;
  stats: {
    totalRooms: number;
    recordedCount: number;
    totalRevenue: number;
  };
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  selectedMonth,
  onMonthChange,
  onOpenQuickWalkthrough,
  onOpenGuide,
  stats,
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md no-print">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark */}
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <div className="p-1.5 bg-sky-500/20 text-sky-400 rounded-lg">
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap">
            ระบบจดมิเตอร์และรายงานรูปภาพหอพัก
          </span>
        </div>

        {/* Zone 2: Concise navigation links (single-line, whitespace-nowrap) */}
        <nav className="hidden lg:flex items-center gap-5 text-xs sm:text-sm font-medium text-slate-300">
          <button
            onClick={() => onTabChange('photoReport')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              currentTab === 'photoReport' ? 'text-sky-400 font-semibold' : 'hover:text-white'
            }`}
          >
            รายงานรูปภาพมิเตอร์
          </button>
          <button
            onClick={() => onTabChange('buildingSheet')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              currentTab === 'buildingSheet' ? 'text-sky-400 font-semibold' : 'hover:text-white'
            }`}
          >
            ตารางจดรายอาคาร
          </button>
          <button
            onClick={() => onTabChange('baseline')}
            className={`transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-lg ${
              currentTab === 'baseline' ? 'bg-amber-400/20 text-amber-300 font-bold border border-amber-400/40' : 'hover:text-white hover:bg-slate-800'
            }`}
            title="จัดการและตรวจสอบเลขตั้งต้นมิเตอร์น้ำและไฟฟ้า"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>เลขตั้งต้น</span>
          </button>
          <button
            onClick={() => onTabChange('analytics')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              currentTab === 'analytics' ? 'text-sky-400 font-semibold' : 'hover:text-white'
            }`}
          >
            สรุปค่าใช้จ่ายอัตโนมัติ
          </button>
          <button
            onClick={() => onTabChange('grid')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              currentTab === 'grid' ? 'text-sky-400 font-semibold' : 'hover:text-white'
            }`}
          >
            ผังห้องพัก
          </button>
          <button
            onClick={() => onTabChange('invoices')}
            className={`transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              currentTab === 'invoices' ? 'text-sky-400 font-semibold' : 'hover:text-white'
            }`}
          >
            <span>พิมพ์ใบแจ้งหนี้ & ประกาศ (PDF)</span>
          </button>
          <button
            onClick={() => onTabChange('export')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              currentTab === 'export' ? 'text-sky-400 font-semibold' : 'hover:text-white'
            }`}
          >
            Google & ส่งออกข้อมูล
          </button>
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 border border-slate-700 shadow-xs"
            title="เปิดดูคู่มือและขั้นตอนการใช้งานระบบ"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>คู่มือใช้งาน</span>
          </button>

          <button
            onClick={onOpenQuickWalkthrough}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>จดมิเตอร์ด่วน</span>
          </button>
        </div>
      </div>

      {/* Secondary Bar: Month selector & Global KPIs */}
      <div className="bg-slate-950/60 border-t border-slate-800/80 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {/* Month selector */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-400" />
            <span className="text-slate-400 font-medium">ประจำเดือน:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              className="bg-slate-800 text-white font-semibold px-2.5 py-1 rounded-md border border-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-sky-400"
            />
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-[11px] text-slate-400">
            <div>
              ห้องทั้งหมด: <b className="text-white tabular-nums">{stats.totalRooms}</b> ห้อง
            </div>
            <span className="text-slate-700" aria-hidden="true">·</span>
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>บันทึกแล้ว:</span>
              <b className="text-emerald-400 tabular-nums">{stats.recordedCount}</b>
            </div>
            <span className="text-slate-700" aria-hidden="true">·</span>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>รอจด:</span>
              <b className="text-amber-400 tabular-nums">{stats.totalRooms - stats.recordedCount}</b>
            </div>
            <span className="text-slate-700" aria-hidden="true">·</span>
            <div>
              ยอดรวมประเมิน: <b className="text-sky-300 tabular-nums">฿{formatNumber(stats.totalRevenue)}</b>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex lg:hidden overflow-x-auto gap-2 pt-2.5 border-t border-slate-800/60 text-xs">
          <button
            onClick={() => onTabChange('photoReport')}
            className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
              currentTab === 'photoReport' ? 'bg-sky-600 text-white' : 'text-slate-300'
            }`}
          >
            รายงานรูปภาพ
          </button>
          <button
            onClick={() => onTabChange('buildingSheet')}
            className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
              currentTab === 'buildingSheet' ? 'bg-sky-600 text-white' : 'text-slate-300'
            }`}
          >
            ตารางจดรายอาคาร
          </button>
          <button
            onClick={() => onTabChange('baseline')}
            className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
              currentTab === 'baseline' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-amber-300'
            }`}
          >
            เลขตั้งต้น
          </button>
          <button
            onClick={() => onTabChange('analytics')}
            className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
              currentTab === 'analytics' ? 'bg-sky-600 text-white' : 'text-slate-300'
            }`}
          >
            สรุปค่าใช้จ่าย
          </button>
          <button
            onClick={() => onTabChange('grid')}
            className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
              currentTab === 'grid' ? 'bg-sky-600 text-white' : 'text-slate-300'
            }`}
          >
            ผังห้อง
          </button>
          <button
            onClick={() => onTabChange('invoices')}
            className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
              currentTab === 'invoices' ? 'bg-sky-600 text-white font-bold' : 'text-slate-300'
            }`}
          >
            พิมพ์หนี้/ติดบอร์ด
          </button>
          <button
            onClick={() => onTabChange('export')}
            className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
              currentTab === 'export' ? 'bg-sky-600 text-white' : 'text-slate-300'
            }`}
          >
            ส่งออก Sheets & ฐานข้อมูล
          </button>
          <button
            onClick={onOpenGuide}
            className="px-2.5 py-1 rounded-md whitespace-nowrap bg-amber-400 text-slate-950 font-bold"
          >
            คู่มือใช้งาน
          </button>
        </div>
      </div>
    </header>
  );
};
