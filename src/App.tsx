import React, { useState, useEffect, useMemo } from 'react';
import {
  BUILDINGS_CONFIG,
  generateMasterRooms,
  seedSeptember2026Data,
} from './data/dormData';
import { RoomDefinition, MeterRecord } from './types';
import { Navbar, ActiveTab } from './components/Navbar';
import { PhotoReportTab } from './components/PhotoReportTab';
import { BuildingSheetTab } from './components/BuildingSheetTab';
import { BaselineMeterTab } from './components/BaselineMeterTab';
import { AutoExpenseAnalyticsTab } from './components/AutoExpenseAnalyticsTab';
import { RoomGridTab } from './components/RoomGridTab';
import { WalkthroughTab } from './components/WalkthroughTab';
import { InvoicesTab } from './components/InvoicesTab';
import { SheetsExportTab } from './components/SheetsExportTab';
import { RecordModal } from './components/RecordModal';
import { UserGuideModal } from './components/UserGuideModal';
import { CheckCircle2, AlertCircle, Zap } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<ActiveTab>('photoReport');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');
  const [allRecords, setAllRecords] = useState<Record<string, Record<string, MeterRecord>>>({});
  const [modalRoom, setModalRoom] = useState<RoomDefinition | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  // Master room list
  const masterRooms = useMemo(() => generateMasterRooms(), []);

  // Initialize and load local storage
  useEffect(() => {
    const saved = localStorage.getItem('dorm_meter_records_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAllRecords(parsed);
        return;
      } catch (e) {
        console.error('Failed to parse saved records', e);
      }
    }

    // Seed authentic data matching user's September 2026 PDF documents
    const initialSeed = seedSeptember2026Data();
    const initialRecords: Record<string, Record<string, MeterRecord>> = {
      '2026-09': initialSeed,
    };
    setAllRecords(initialRecords);
    localStorage.setItem('dorm_meter_records_v2', JSON.stringify(initialRecords));
  }, []);

  const saveToStorage = (updated: Record<string, Record<string, MeterRecord>>) => {
    setAllRecords(updated);
    localStorage.setItem('dorm_meter_records_v2', JSON.stringify(updated));
  };

  const currentMonthRecords = useMemo(() => {
    return allRecords[selectedMonth] || {};
  }, [allRecords, selectedMonth]);

  // Previous month records helper
  const previousMonthRecords = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    let prevY = y;
    let prevM = m - 1;
    if (prevM < 1) {
      prevM = 12;
      prevY--;
    }
    const prevKey = `${prevY}-${String(prevM).padStart(2, '0')}`;
    return allRecords[prevKey] || {};
  }, [allRecords, selectedMonth]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3500);
  };

  const handleUpdateRecord = (roomId: string, partial: Partial<MeterRecord>) => {
    const monthRecs = { ...currentMonthRecords };
    const existing = monthRecs[roomId];
    if (existing) {
      const waterPrev = partial.waterPrev !== undefined ? partial.waterPrev : existing.waterPrev;
      const waterCurr = partial.waterCurr !== undefined ? partial.waterCurr : existing.waterCurr;
      const elecPrev = partial.elecPrev !== undefined ? partial.elecPrev : existing.elecPrev;
      const elecCurr = partial.elecCurr !== undefined ? partial.elecCurr : existing.elecCurr;
      const occupants = partial.occupants !== undefined ? partial.occupants : (existing.occupants || 1);

      const isFlatWater = existing.waterType === 'flat_per_person';
      const waterUnits = isFlatWater ? 0 : Math.max(0, waterCurr - waterPrev);
      const waterCost = isFlatWater ? occupants * 100 : waterUnits * 20;

      const elecUnits = Math.max(0, elecCurr - elecPrev);
      const elecCost = elecUnits * 6;
      const totalAmount = waterCost + elecCost;

      monthRecs[roomId] = {
        ...existing,
        ...partial,
        waterPrev,
        waterCurr,
        waterUnits,
        waterCost,
        elecPrev,
        elecCurr,
        elecUnits,
        elecCost,
        totalAmount,
      };
      const updated = { ...allRecords, [selectedMonth]: monthRecs };
      saveToStorage(updated);
    } else {
      // Room doesn't have a record yet; initialize one with master definition
      const roomDef = masterRooms.find((r) => r.id === roomId);
      if (roomDef) {
        const isFlatWater = roomDef.waterType === 'flat_per_person';
        const waterPrev = partial.waterPrev !== undefined ? partial.waterPrev : 0;
        const waterCurr = partial.waterCurr !== undefined ? partial.waterCurr : waterPrev;
        const elecPrev = partial.elecPrev !== undefined ? partial.elecPrev : 0;
        const elecCurr = partial.elecCurr !== undefined ? partial.elecCurr : elecPrev;
        const occupants = partial.occupants || 1;
        const waterUnits = isFlatWater ? 0 : Math.max(0, waterCurr - waterPrev);
        const waterCost = isFlatWater ? occupants * 100 : waterUnits * 20;
        const elecUnits = Math.max(0, elecCurr - elecPrev);
        const elecCost = elecUnits * 6;
        const totalAmount = waterCost + elecCost;

        monthRecs[roomId] = {
          roomId: roomDef.id,
          buildingId: roomDef.buildingId,
          buildingName: roomDef.buildingName,
          roomNo: roomDef.roomNo,
          floor: roomDef.floor,
          waterType: roomDef.waterType,
          waterPrev,
          waterCurr,
          occupants,
          waterUnits,
          waterCost,
          elecPrev,
          elecCurr,
          elecUnits,
          elecCost,
          totalAmount,
          recordedAt: new Date().toISOString(),
          verified: false,
          ...partial,
        };
        const updated = { ...allRecords, [selectedMonth]: monthRecs };
        saveToStorage(updated);
      }
    }
  };

  const handleBatchUpdateRecords = (updatedRecords: Record<string, MeterRecord>) => {
    const monthRecs = { ...currentMonthRecords, ...updatedRecords };
    const updated = { ...allRecords, [selectedMonth]: monthRecs };
    saveToStorage(updated);
  };

  const handleSaveRecord = (newRecord: MeterRecord) => {
    const monthRecs = { ...currentMonthRecords, [newRecord.roomId]: newRecord };
    const updated = { ...allRecords, [selectedMonth]: monthRecs };
    saveToStorage(updated);
  };

  const stats = useMemo(() => {
    const totalRooms = masterRooms.length;
    const recList = Object.values(currentMonthRecords);
    const recordedCount = recList.length;
    const totalRevenue = recList.reduce((sum, r) => sum + (r.totalAmount || 0), 0);

    return { totalRooms, recordedCount, totalRevenue };
  }, [masterRooms, currentMonthRecords]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed bottom-5 right-5 z-50 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold transition-all transform duration-200 no-print ${
            toast.type === 'success' ? 'bg-emerald-700' : 'bg-rose-700'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-200" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Primary Top Bar & Secondary Controls */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        onOpenQuickWalkthrough={() => setCurrentTab('walkthrough')}
        onOpenGuide={() => setIsGuideOpen(true)}
        stats={stats}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {currentTab === 'photoReport' && (
          <PhotoReportTab
            masterRooms={masterRooms}
            records={currentMonthRecords}
            selectedMonth={selectedMonth}
            buildings={BUILDINGS_CONFIG}
            onUpdateRecord={handleUpdateRecord}
            showToast={showToast}
          />
        )}

        {currentTab === 'buildingSheet' && (
          <BuildingSheetTab
            masterRooms={masterRooms}
            records={currentMonthRecords}
            selectedMonth={selectedMonth}
            buildings={BUILDINGS_CONFIG}
            onOpenRecordModal={(room) => setModalRoom(room)}
            onUpdateRecord={handleUpdateRecord}
            showToast={showToast}
          />
        )}

        {currentTab === 'baseline' && (
          <BaselineMeterTab
            masterRooms={masterRooms}
            records={currentMonthRecords}
            previousMonthRecords={previousMonthRecords}
            selectedMonth={selectedMonth}
            buildings={BUILDINGS_CONFIG}
            onUpdateRecord={handleUpdateRecord}
            onBatchUpdateRecords={handleBatchUpdateRecords}
            showToast={showToast}
          />
        )}

        {currentTab === 'analytics' && (
          <AutoExpenseAnalyticsTab
            masterRooms={masterRooms}
            records={currentMonthRecords}
            selectedMonth={selectedMonth}
            buildings={BUILDINGS_CONFIG}
            showToast={showToast}
          />
        )}

        {currentTab === 'grid' && (
          <RoomGridTab
            masterRooms={masterRooms}
            records={currentMonthRecords}
            buildings={BUILDINGS_CONFIG}
            onOpenRecordModal={(room) => setModalRoom(room)}
          />
        )}

        {currentTab === 'walkthrough' && (
          <WalkthroughTab
            masterRooms={masterRooms}
            records={currentMonthRecords}
            selectedMonth={selectedMonth}
            buildings={BUILDINGS_CONFIG}
            onSaveRecord={handleSaveRecord}
            showToast={showToast}
          />
        )}

        {currentTab === 'invoices' && (
          <InvoicesTab
            masterRooms={masterRooms}
            records={currentMonthRecords}
            selectedMonth={selectedMonth}
            buildings={BUILDINGS_CONFIG}
          />
        )}

        {currentTab === 'export' && (
          <SheetsExportTab
            records={currentMonthRecords}
            allRecords={allRecords}
            onRestoreAllRecords={(imported) => saveToStorage(imported)}
            selectedMonth={selectedMonth}
            showToast={showToast}
          />
        )}
      </main>

      {/* Record & Edit Modal */}
      <RecordModal
        isOpen={!!modalRoom}
        onClose={() => setModalRoom(null)}
        room={modalRoom}
        currentRecord={modalRoom ? currentMonthRecords[modalRoom.id] : null}
        previousRecord={modalRoom ? previousMonthRecords[modalRoom.id] : null}
        selectedMonth={selectedMonth}
        onSave={handleSaveRecord}
        showToast={showToast}
      />

      {/* Interactive User Guide Modal */}
      <UserGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onGoToTab={(tab) => setCurrentTab(tab)}
      />

      {/* Mobile Floating Action Button (FAB) for Quick Meter Recording */}
      {currentTab !== 'walkthrough' && (
        <aside aria-label="เมนูลอยมือถือ" className="sm:hidden fixed bottom-5 right-4 z-40 no-print animate-in fade-in slide-in-from-bottom-4 duration-300">
          <button
            onClick={() => setCurrentTab('walkthrough')}
            className="flex items-center gap-2.5 px-4.5 py-3 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm shadow-2xl shadow-amber-500/60 border-2 border-white ring-2 ring-slate-900/10 active:scale-95 transition-all"
            aria-label="ปุ่มจดมิเตอร์ด่วนบนมือถือ"
          >
            <div className="p-1.5 bg-slate-950 text-amber-400 rounded-full shadow-inner flex items-center justify-center">
              <Zap className="w-4 h-4 fill-amber-400" />
            </div>
            <span className="font-bold tracking-tight">จดมิเตอร์ด่วน</span>
            {stats.totalRooms - stats.recordedCount > 0 && (
              <span className="bg-slate-950 text-amber-300 text-[11px] px-2 py-0.5 rounded-full font-mono font-bold">
                {stats.totalRooms - stats.recordedCount}
              </span>
            )}
          </button>
        </aside>
      )}
    </div>
  );
}
