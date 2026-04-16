/**
 * WorldEngine - Phaser 3 based world rendering
 * Handles: tilemap, player/monster sprites, animations, camera, collision (visual only)
 */

import * as Phaser from 'phaser';
import { Position } from '../../../server/src/types/player.js';

export interface WorldConfig {
  serverUrl: string;
  wsUrl: string;
  playerId: string;
}

export class WorldEngine extends Phaser.Scene {
  private config!: WorldConfig;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  
  // Entities
  private playerSprite!: Phaser.GameObjects.Sprite;
  private monsters: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private otherPlayers: Map<string, Phaser.GameObjects.Sprite> = new Map();
  
  // World
  private tilemap!: Phaser.Tilemaps.Tilemap;
  private tilemapLayer!: Phaser.Tilemaps.TilemapLayer;
  private camera!: Phaser.Cameras.Scene2D.Camera;
  
  // WebSocket
  private ws!: WebSocket;
  private connected: boolean = false;
  
  // Input state
  private moveDirection: { x: number; y: number } = { x: 0, y: 0 };
  private lastPosition: Position = { x: 1600, y: 1600, zone: 'zone_1' };
  
  // Callbacks
  private onStateDelta?: (delta: any) => void;
  private onCombatResult?: (result: any) => void;

  constructor() {
    super({ key: 'WorldEngine' });
  }

  preload() {
    // Load assets
    this.load.tilemapTiledJSON('world_map', '/assets/maps/world.json');
    
    // Tile sheets
    this.load.image('grass_tiles', '/assets/tiles/grass_sheet.png');
    this.load.image('water_tiles', '/assets/tiles/water_sheet.png');
    
    // Character sprites
    this.load.spritesheet('player_idle', '/assets/characters/novice/idle.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('player_walk', '/assets/characters/novice/walk.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('player_attack', '/assets/characters/novice/attack.png', { frameWidth: 32, frameHeight: 32 });
    
    // Monster sprites
    this.load.spritesheet('rat', '/assets/monsters/rat.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('crab', '/assets/monsters/crab.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('orc', '/assets/monsters/orc_warrior.png', { frameWidth: 48, frameHeight: 48 });
  }

  create() {
    // Parse config from scene data
    this.config = this.scene.systems.config as unknown as WorldConfig;
    
    // Create tilemap
    this.tilemap = this.make.tilemap({ key: 'world_map' });
    const grassTiles = this.tilemap.addTilesetImage('Grass', 'grass_tiles');
    const waterTiles = this.tilemap.addTilesetImage('Water', 'water_tiles');
    
    this.tilemapLayer = this.tilemap.createLayer(0, [grassTiles, waterTiles]);
    
    // Player sprite
    this.playerSprite = this.add.sprite(0, 0, 'player_idle');
    this.playerSprite.setScale(2);
    
    // Create animations
    this.createAnimations();
    
    // Camera
    this.camera = this.cameras.main;
    this.camera.setBounds(0, 0, 3200, 3200);
    this.camera.startFollow(this.playerSprite, true, 0.1, 0.1);
    
    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.sendMoveTarget(pointer.x, pointer.y);
    });
    
    // WebSocket connection
    this.connectWebSocket();
  }

  private createAnimations() {
    // Player animations
    this.anims.create({
      key: 'player_idle',
      frames: this.anims.generateFrameNumbers('player_idle', { start: 0, end: 1 }),
      frameRate: 2,
      repeat: -1
    });
    
    this.anims.create({
      key: 'player_walk',
      frames: this.anims.generateFrameNumbers('player_walk', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });
    
    this.anims.create({
      key: 'player_attack',
      frames: this.anims.generateFrameNumbers('player_attack', { start: 0, end: 2 }),
      frameRate: 12,
      repeat: 0
    });
    
    // Monster animations
    this.anims.create({
      key: 'rat_idle',
      frames: this.anims.generateFrameNumbers('rat', { start: 0, end: 1 }),
      frameRate: 2,
      repeat: -1
    });
    
    this.anims.create({
      key: 'rat_attack',
      frames: this.anims.generateFrameNumbers('rat', { start: 2, end: 4 }),
      frameRate: 12,
      repeat: 0
    });
  }

  private connectWebSocket() {
    this.ws = new WebSocket(this.config.wsUrl);
    
    this.ws.onopen = () => {
      this.connected = true;
      console.log('[World] WebSocket connected');
    };
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleServerMessage(message);
    };
    
    this.ws.onclose = () => {
      this.connected = false;
      console.log('[World] WebSocket disconnected');
      // Reconnect logic
      setTimeout(() => this.connectWebSocket(), 3000);
    };
    
    this.ws.onerror = (err) => {
      console.error('[World] WebSocket error:', err);
    };
  }

  private handleServerMessage(message: any) {
    switch (message.type) {
      case 'state_delta':
        this.applyStateDelta(message);
        this.onStateDelta?.(message);
        break;
      case 'combat_result':
        this.onCombatResult?.(message);
        break;
      case 'chat':
        this.handleChat(message);
        break;
      case 'batch':
        message.updates.forEach((update: any) => this.handleServerMessage(update));
        break;
    }
  }

  private applyStateDelta(delta: any) {
    if (delta.playerId === this.config.playerId) {
      this.lastPosition = delta.position;
    }
    
    // Update other entities (simplified)
    // In production: use phaser tweens for smooth interpolation
  }

  private sendMoveTarget(x: number, y: number) {
    const worldX = x;
    const worldY = y;
    
    this.ws.send(JSON.stringify({
      type: 'move',
      data: { x: worldX, y: worldY }
    }));
    
    this.playerSprite.x = worldX;
    this.playerSprite.y = worldY;
  }

  update(time: number, delta: number) {
    // Input handling
    this.moveDirection = { x: 0, y: 0 };
    
    if (this.cursors.left.isDown) {
      this.moveDirection.x = -1;
    } else if (this.cursors.right.isDown) {
      this.moveDirection.x = 1;
    }
    
    if (this.cursors.up.isDown) {
      this.moveDirection.y = -1;
    } else if (this.cursors.down.isDown) {
      this.moveDirection.y = 1;
    }
    
    // Send movement if pressing keys
    if (this.moveDirection.x !== 0 || this.moveDirection.y !== 0) {
      const speed = 100;
      const newX = this.lastPosition.x + this.moveDirection.x * speed * (delta / 1000);
      const newY = this.lastPosition.y + this.moveDirection.y * speed * (delta / 1000);
      
      this.ws.send(JSON.stringify({
        type: 'move',
        data: { x: Math.max(0, Math.min(newX, 3200)), y: Math.max(0, Math.min(newY, 3200)) }
      }));
      
      this.lastPosition = { ...this.lastPosition, x: newX, y: newY };
      this.playerSprite.setFrame(this.moveDirection.x !== 0 || this.moveDirection.y !== 0 ? 'player_walk' : 'player_idle');
    }
    
    // Monster updates for nearby area
    // Spawn monsters based on server state
  }

  addMonster(monsterId: string, monster: any) {
    if (this.monsters.has(monsterId)) return;
    
    const sprite = this.add.sprite(monster.position.x, monster.position.y, 'rat');
    sprite.setScale(2);
    sprite.setFrame('rat_idle');
    this.monsters.set(monsterId, sprite);
  }

  removeMonster(monsterId: string) {
    const sprite = this.monsters.get(monsterId);
    if (sprite) {
      sprite.destroy();
      this.monsters.delete(monsterId);
    }
  }

  updateMonsterPosition(monsterId: string, x: number, y: number) {
    const sprite = this.monsters.get(monsterId);
    if (sprite) {
      sprite.x = x;
      sprite.y = y;
    }
  }

  setOnStateDelta(callback: (delta: any) => void) {
    this.onStateDelta = callback;
  }

  setOnCombatResult(callback: (result: any) => void) {
    this.onCombatResult = callback;
  }

  getPlayerPosition(): Position {
    return this.lastPosition;
  }
}
