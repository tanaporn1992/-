import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Sun, CheckCircle } from 'lucide-react';

interface PhotoZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl: string | null;
  title: string;
  roomNo: string;
  meterType: 'water' | 'electricity';
  currentReading?: number;
  timestamp?: string | null;
  onConfirmReading?: (reading: number) => void;
}

export const PhotoZoomModal: React.FC<PhotoZoomModalProps> = ({
  isOpen,
  onClose,
  photoUrl,
  title,
  roomNo,
  meterType,
  currentReading,
  timestamp,
  onConfirmReading,
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [highContrast, setHighContrast] = useState(false);
  const [manualReading, setManualReading] = useState(currentReading?.toString() || '');

  if (!isOpen || !photoUrl) return null;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.3, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.3, 0.7));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const toggleContrast = () => setHighContrast((prev) => !prev);

  const handleSave = () => {
    if (onConfirmReading && manualReading !== '') {
      onConfirmReading(parseFloat(manualReading) || 0);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 no-print">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${meterType === 'water' ? 'bg-sky-500/20 text-sky-400' : 'bg-amber-500/20 text-amber-400'}`}>
              <span className="font-bold text-xs uppercase">{meterType === 'water' ? 'น้ำประปา' : 'ไฟฟ้า'}</span>
            </div>
            <div>
              <h3 className="text-base font-bold">{title} • ห้อง {roomNo}</h3>
              <p className="text-xs text-slate-400">
                {timestamp ? `บันทึกเมื่อ: ${new Date(timestamp).toLocaleString('th-TH')}` : 'ภาพถ่ายหลักฐานมิเตอร์'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-5 py-2.5 bg-slate-800/80 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomIn}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
              title="ขยายภาพ"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>ขยาย</span>
            </button>
            <button
              onClick={handleZoomOut}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
              title="ย่อภาพ"
            >
              <ZoomOut className="w-3.5 h-3.5" />
              <span>ย่อ</span>
            </button>
            <button
              onClick={handleRotate}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
              title="หมุน 90 องศา"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>หมุนภาพ</span>
            </button>
            <button
              onClick={toggleContrast}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors ${
                highContrast ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-700 hover:bg-slate-600'
              }`}
              title="เพิ่มความสว่าง/คอนทราสต์เพื่อให้อ่านตัวเลขได้ชัดเจน"
            >
              <Sun className="w-3.5 h-3.5" />
              <span>{highContrast ? 'โหมดชัดพิเศษ (เปิด)' : 'เร่งคอนทราสต์'}</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400">
            ซูม: {(zoomLevel * 100).toFixed(0)}% • หมุน: {rotation}°
          </div>
        </div>

        {/* Viewport */}
        <div className="flex-1 overflow-auto bg-black p-4 flex items-center justify-center min-h-[350px]">
          <div
            className="transition-transform duration-200 origin-center flex items-center justify-center max-w-full max-h-full"
            style={{
              transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
              filter: highContrast ? 'contrast(170%) brightness(125%)' : 'none',
            }}
          >
            <img
              src={photoUrl}
              alt={`Meter ${roomNo}`}
              className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-lg"
            />
          </div>
        </div>

        {/* Footer verification control */}
        <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">เลขมิเตอร์ที่ตรวจสอบจากภาพ:</span>
            <input
              type="number"
              value={manualReading}
              onChange={(e) => setManualReading(e.target.value)}
              className="w-32 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="กรอกเลขมิเตอร์"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
            >
              ปิดหน้าต่าง
            </button>
            {onConfirmReading && (
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors shadow-sm"
              >
                <CheckCircle className="w-4 h-4" />
                <span>ยืนยันเลขมิเตอร์</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
