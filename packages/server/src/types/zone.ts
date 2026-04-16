/**
 * Zone Type Definitions
 */

export interface ZoneBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Zone {
  id: string;
  name: string;
  width: number;
  height: number;
  tileSize: number;
  bounds: ZoneBounds;
  entities: Set<string>;
  monsters: Set<string>;
  npcs?: string[];
  exits?: ZoneExit[];
}

export interface ZoneExit {
  targetZone: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TileMapData {
  width: number;
  height: number;
  tileSize: number;
  layers: TileLayer[];
}

export interface TileLayer {
  name: string;
  data: number[][];
  visible: boolean;
}
