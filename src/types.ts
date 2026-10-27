export type WaterBillingType = 'unit' | 'flat_per_person';

export interface RoomDefinition {
  id: string; // e.g., 'thachana_101'
  buildingId: string;
  buildingName: string;
  roomNo: string;
  floor: number;
  waterType: WaterBillingType;
  waterRate: number; // e.g., 20
  waterNote: string;
}

export interface MeterRecord {
  roomId: string;
  buildingId: string;
  buildingName: string;
  roomNo: string;
  floor: number;
  waterType: WaterBillingType;

  // Water meter
  waterPrev: number;
  waterCurr: number;
  occupants?: number;
  waterUnits: number;
  waterCost: number;
  waterPhoto?: string | null;
  waterPhotoTimestamp?: string | null;

  // Electricity meter
  elecPrev: number;
  elecCurr: number;
  elecUnits: number;
  elecCost: number;
  elecPhoto?: string | null;
  elecPhotoTimestamp?: string | null;

  // Financials & metadata
  remark?: string;
  totalAmount: number;
  recordedAt: string;
  verified?: boolean;
}

export interface BuildingConfig {
  id: string;
  name: string;
  waterType: WaterBillingType;
  waterRate: number;
  elecRate: number;
  groups?: Array<{
    ranges: string;
    waterType: WaterBillingType;
    waterRate: number;
    note: string;
  }>;
  ranges?: string;
}

export interface MonthlyAnalytics {
  totalRooms: number;
  recordedCount: number;
  completionRate: number;
  totalWaterUnits: number;
  totalWaterCost: number;
  totalElecUnits: number;
  totalElecCost: number;
  totalRevenue: number;
  avgCostPerRoom: number;
  highWaterAlerts: MeterRecord[];
  highElecAlerts: MeterRecord[];
}

export interface SystemSettings {
  defaultElecRate: number; // default 6 THB
  defaultWaterRate: number; // default 20 THB
  defaultFlatWaterRate: number; // default 100 THB/person
  dormName: string;
  contactPhone: string;
}
