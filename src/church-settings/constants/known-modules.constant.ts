export const KNOWN_MODULES = [
  { key: 'incident_report', moduleName: 'Incident Report', required: false },
  { key: 'asset_management', moduleName: 'Asset Management', required: false },
] as const;

export type KnownModuleKey = (typeof KNOWN_MODULES)[number]['key'];
