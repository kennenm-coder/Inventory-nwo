export interface Sheet {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  _count: { rows: number; fields: number };
}

export interface Field {
  id: string;
  key: string;
  title: string;
  type: string;
  position: number;
  settings: Record<string, unknown>;
}

export interface Row {
  id: string;
  barcode: string | null;
  data: Record<string, unknown>;
  createdAt: string;
  createdBy?: { id: string; name: string };
  lastModifiedBy?: { id: string; name: string };
}

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  MainTabs: undefined;
  SheetDetail: { sheetId: string; sheetName: string };
  RowDetail: { sheetId: string; rowId: string; sheetName: string };
  RowCreate: { sheetId: string; sheetName: string; barcode?: string };
};

export type TabParamList = {
  Sheets: undefined;
  Scanner: undefined;
  Settings: undefined;
};
