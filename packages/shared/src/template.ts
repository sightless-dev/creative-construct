export type Language = "ru" | "en" | "uk";
export type LayerType = "image" | "text" | "group";
export interface BaseLayer {
  id: string; name: string; type: LayerType;
  x: number; y: number; width: number; height: number;
  rotation: number; opacity: number; visible: boolean;
  slotKey?: string;
}
export interface ImageLayer extends BaseLayer {
  type: "image";
  assetRef?: { assetId?: string; url?: string };
  fit?: "cover" | "contain" | "stretch";
}
export interface TextLayer extends BaseLayer {
  type: "text";
  text: string; fontFamily: string; fontSize: number;
  fontWeight?: number; color: string; align: "left"|"center"|"right";
}
export interface GroupLayer extends BaseLayer { type:"group"; children: Layer[]; }
export type Layer = ImageLayer|TextLayer|GroupLayer;

export interface TemplateV1 {
  version: 1;
  id: string;
  name: string;
  canvas: { width: number; height: number; background: string };
  slots: Array<{ key: string; kind: "image"|"text"; category:"BG"|"TEXT"|"ELEMENTS"; required?: boolean }>;
  layers: Layer[];
}
