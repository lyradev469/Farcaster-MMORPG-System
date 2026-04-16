/**
 * Player Type Definitions
 */

export interface Position {
  x: number;
  y: number;
  zone: string;
}

export interface Stats {
  str: number;
  agi: number;
  vit: number;
  int: number;
  dex: number;
  luk: number;
}

export interface Equipment {
  weapon: Weapon | null;
  armor: Armor | null;
  helmet: Helmet | null;
  boots: Boots | null;
  accessory: Accessory | null;
}

export interface Weapon {
  id: string;
  name: string;
  atk: number;
  upgrade: number;
  refineBonus?: number;
}

export interface Armor {
  id: string;
  name: string;
  def: number;
  upgrade: number;
}

export interface Helmet {
  id: string;
  name: string;
  def: number;
  upgrade: number;
}

export interface Boots {
  id: string;
  name: string;
  def: number;
  spd: number;
}

export interface Accessory {
  id: string;
  name: string;
  effect: string;
  value: number;
}

export interface Skill {
  id: string;
  level: number;
  maxLevel: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'consumable' | 'material' | 'card';
  quantity: number;
  data?: any;
}

export interface Player {
  id: string;
  username: string;
  walletAddress?: string;
  level: number;
  job: string;
  stats: Stats;
  position: Position;
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  exp: number;
  jobExp: number;
  nextExp: number;
  skills: Skill[];
  equipment: Equipment;
  inventory: InventoryItem[];
  state: 'idle' | 'moving' | 'attacking' | 'casting' | 'fleeing';
  lastAction: number;
  
  // Computed values (not persisted)
  attack?: number;
  defense?: number;
  speed?: number;
  luck?: number;
}

export type PlayerState = Pick<Player, 'id' | 'username' | 'level' | 'job' | 'stats' | 'position' | 'hp' | 'maxHp' | 'sp' | 'maxSp' | 'exp' | 'skills' | 'equipment' | 'state'>;
