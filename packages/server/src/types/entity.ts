/**
 * Entity Type Definitions - Base type for all game entities
 */

import { Position } from './player.js';

export interface Entity {
  id: string;
  name: string;
  type: 'player' | 'monster' | 'npc' | 'item';
  
  // Common combat stats
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  luk?: number;
  
  // Position
  position: Position;
  
  // State
  state: 'idle' | 'moving' | 'attacking' | 'dead';
  targetId: string | null;
  
  // Monster-specific
  configId?: string;
  expReward?: number;
  dropTable?: DropItem[];
  
  // Metadata
  lastAction: number;
}

export interface DropItem {
  id: string;
  name: string;
  chance: number;
  minCount: number;
  maxCount: number;
}
