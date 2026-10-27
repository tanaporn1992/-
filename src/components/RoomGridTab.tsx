import React, { useState, useMemo } from 'react';
import { Search, Plus, Check, Droplets, Zap, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { RoomDefinition, MeterRecord, BuildingConfig } from '../types';
import { formatNumber } from '../data/dormData';

interface RoomGridTabProps {
  masterRooms: RoomDefinition[];
  records: Record<string, MeterRecord>;
  buildings: BuildingConfig[];
  onOpenRecordModal: (room: RoomDefinition) => void;
}

export const RoomGridTab: React.FC<RoomGridTabProps> = ({
  masterRooms,
  records,
  buildings,
  onOpenRecordModal,
}) => {
  const [selectedBuilding, setSelectedBuilding] = useState<string>('ALL');
  const [selectedFloor, setSelectedFloor] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'RECORDED' | 'PENDING' | 'HIGH_EXPENSE'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Building averages and 20% alert thresholds
  const buildingAvgMap = useMemo(() => {
    const map: Record<string, { avg: number; threshold: number }> = {};
    buildings.forEach((b) => {
      const bRooms = masterRooms.filter((r) => r.buildingId === b.id);
      const bRecs = bRooms
        .map((r) => records[r.id])
        .filter((rec): rec is MeterRecord => !!rec && rec.totalAmount > 0);
      const avg = bRecs.length > 0 ? bRecs.reduce((sum, r) => sum + r.totalAmount, 0) / bRecs.length : 0;
      map[b.id] = { avg, threshold: avg * 1.20 };
    });
    return map;
  }, [buildings, masterRooms, records]);

  // Grouped filtered rooms
  const groupedRooms = useMemo(() => {
    let filtered = masterRooms.filter((r) => {
      if (selectedBuilding !== 'ALL' && r.buildingId !== selectedBuilding) return false;
      if (selectedFloor !== 'ALL' && r.floor !== parseInt(selectedFloor, 10)) return false;

      const hasRec = !!records[r.id];
      if (statusFilter === 'RECORDED' && !hasRec) return false;
      if (statusFilter === 'PENDING' && hasRec) return false;

      const bStat = buildingAvgMap[r.buildingId];
      const isHigh = hasRec && records[r.id].totalAmount > (bStat?.threshold || 0) && (bStat?.avg || 0) > 0;
      if (statusFilter === 'HIGH_EXPENSE' && !isHigh) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (!r.roomNo.toLowerCase().includes(q) && !r.buildingName.toLowerCase().includes(q)) {
          return false;
        }
      }

      return true;
    });

    const groups: Record<string, { buildingId: string; buildingName: string; rooms: RoomDefinition[] }> = {};
    filtered.forEach((r) => {
      if (!groups[r.buildingId]) {
        groups[r.buildingId] = {
          buildingId: r.buildingId,
          buildingName: r.buildingName,
          rooms: [],
        };
      }
      groups[r.buildingId].rooms.push(r);
    });

    return Object.values(groups);
  }, [masterRooms, records, selectedBuilding, selectedFloor, statusFilter, searchQuery]);

  return (
    <div className="space-y-5">
      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        {/* Building Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            เลือกอาคาร:
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedBuilding('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedBuilding === 'ALL' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              ทุกอาคาร ({masterRooms.length})
            </button>
            {buildings.map((b) => {
              const bRooms = masterRooms.filter((r) => r.buildingId === b.id);
              const bRecorded = bRooms.filter((r) => !!records[r.id]).length;
              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedBuilding(b.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    selectedBuilding === b.id ? 'bg-sky-700 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
            <label className="block text-slate-500 font-medium mb-1">สถานะบันทึก:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
            >
              <option value="ALL">ทั้งหมด</option>
              <option value="RECORDED">บันทึกเรียบร้อยแล้ว</option>
              <option value="PENDING">ยังไม่บันทึก</option>
              <option value="HIGH_EXPENSE">⚠️ ค่าใช้จ่ายสูงเกิน 20%</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">ค้นหาห้อง:</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ระบุเลขห้อง เช่น 201, 4114..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Buildings and Rooms Display */}
      <div className="space-y-6">
        {groupedRooms.map((group) => (
          <div key={group.buildingId} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-slate-900">หอพัก{group.buildingName}</span>
                <span className="text-xs text-slate-500">· {group.rooms.length} ห้อง</span>
              </div>
            </div>

            {/* Matrix of Room Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {group.rooms.map((room) => {
                const rec = records[room.id];
                const hasRec = !!rec;
                const bStat = buildingAvgMap[room.buildingId];
                const isHighExpense = hasRec && rec.totalAmount > (bStat?.threshold || 0) && (bStat?.avg || 0) > 0;
                const percentAbove = isHighExpense ? Math.round(((rec.totalAmount - bStat.avg) / bStat.avg) * 100) : 0;

                return (
                  <div
                    key={room.id}
                    onClick={() => onOpenRecordModal(room)}
                    className={`border rounded-xl p-3 cursor-pointer transition-all flex flex-col justify-between hover:shadow-xs group ${
                      isHighExpense
                        ? 'bg-rose-50/70 border-rose-300 hover:border-rose-400 ring-1 ring-rose-200'
                        : hasRec
                        ? 'bg-slate-50/80 border-slate-300 hover:border-slate-400'
                        : 'bg-white border-dashed border-slate-300 hover:border-sky-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-base text-slate-900">{room.roomNo}</span>
                        {isHighExpense && (
                          <span
                            className="text-rose-600 animate-pulse"
                            title={`แจ้งเตือน: ค่าใช้จ่ายสูงกว่าค่าเฉลี่ยปกติ ${percentAbove}%`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5 fill-rose-100" />
                          </span>
                        )}
                      </div>
                      {hasRec ? (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                          isHighExpense ? 'bg-rose-200/80 text-rose-900 font-bold' : 'text-emerald-700 bg-emerald-50'
                        }`}>
                          <Check className="w-2.5 h-2.5" />
                          <span>{isHighExpense ? `+${percentAbove}%` : 'จดแล้ว'}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          รอจด
                        </span>
                      )}
                    </div>

                    {hasRec ? (
                      <div className="text-xs space-y-1 text-slate-600">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400 flex items-center gap-0.5">
                            <Droplets className="w-3 h-3 text-sky-500" />
                            <span>น้ำ:</span>
                          </span>
                          <span className="font-medium font-mono">
                            {room.waterType === 'flat_per_person' ? `${rec.occupants} คน` : `${rec.waterUnits} หน่วย`}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400 flex items-center gap-0.5">
                            <Zap className="w-3 h-3 text-amber-500" />
                            <span>ไฟ:</span>
                          </span>
                          <span className="font-medium font-mono">{rec.elecUnits} หน่วย</span>
                        </div>

                        {rec.remark && (
                          <div className="text-[10px] bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded truncate">
                            {rec.remark}
                          </div>
                        )}

                        <div className={`pt-1.5 border-t flex items-center justify-between text-xs font-bold ${
                          isHighExpense ? 'border-rose-200 text-rose-950 font-black' : 'border-slate-200/80 text-slate-900'
                        }`}>
                          <span className="text-[11px] text-slate-400 font-normal">รวม:</span>
                          <span className="tabular-nums">฿{formatNumber(rec.totalAmount)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center text-slate-400 flex flex-col items-center justify-center">
                        <Plus className="w-5 h-5 text-slate-300 group-hover:text-sky-600 transition-colors" />
                        <span className="text-[10px] mt-1 text-slate-400 group-hover:text-sky-700">คลิกเพื่อจด</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
