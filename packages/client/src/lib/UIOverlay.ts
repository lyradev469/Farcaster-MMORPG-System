/**
 * UIOverlay - PixiJS based UI rendering layer
 * Handles: HUD bars, damage numbers, skill wheel, cooldowns, party/guild UI
 * RULE: Only UI. No game world rendering.
 */

import * as PIXI from 'pixi.js';

export interface UIConfig {
  playerId: string;
  width: number;
  height: number;
}

export interface HUDState {
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  exp: number;
  nextExp: number;
  level: number;
  job: string;
}

export interface CombatLog {
  id: string;
  text: string;
  color: number;
  timestamp: number;
  duration: number;
}

export class UIOverlay {
  private config!: UIConfig;
  private app!: PIXI.Application;
  private container!: PIXI.Container;
  
  // HUD Elements
  private hudLayer!: PIXI.Container;
  private hpBar!: PIXI.Graphics;
  private spBar!: PIXI.Graphics;
  private expBar!: PIXI.Graphics;
  private levelText!: PIXI.Text;
  private jobText!: PIXI.Text;
  
  // Damage Numbers
  private damageLayer!: PIXI.Container;
  private floatingTexts: Map<string, PIXI.Text> = new Map();
  
  // Skill UI
  private skillWheel!: PIXI.Container;
  private skillButtons: Map<string, PIXI.Container> = new Map();
  private cooldownOverlays: Map<string, PIXI.Graphics> = new Map();
  
  // Chat
  private chatLayer!: PIXI.Container;
  private chatMessage!: PIXI.Text;
  private chatInput!: PIXI.Text;
  
  // State
  private hudState: HUDState = {
    hp: 100,
    maxHp: 100,
    sp: 50,
    maxSp: 50,
    exp: 0,
    nextExp: 100,
    level: 1,
    job: 'Novice'
  };
  
  // Callbacks
  private onSkillClick?: (skillId: string) => void;
  private onTargetSelect?: (targetId: string) => void;

  constructor() {
    // Initialize PIXI application
  }

  init(config: UIConfig) {
    this.config = config;
    
    // Create PIXI Application
    this.app = new PIXI.Application({
      width: config.width,
      height: config.height,
      backgroundColor: 0x1099bb,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    });
    
    document.body.appendChild(this.app.view as any);
    
    // Create layers
    this.container = new PIXI.Container();
    this.app.stage.addChild(this.container);
    
    this.createHUD();
    this.createDamageLayer();
    this.createSkillWheel();
    this.createChat();
    
    // Start update loop
    this.app.ticker.add((delta) => this.update(delta));
  }

  private createHUD() {
    this.hudLayer = new PIXI.Container();
    this.hudLayer.position.set(20, this.config.height - 120);
    this.container.addChild(this.hudLayer);
    
    // HP Bar Background
    const hpBg = new PIXI.Graphics();
    hpBg.beginFill(0x333333);
    hpBg.drawRoundedRect(0, 0, 300, 25, 5);
    hpBg.endFill();
    this.hudLayer.addChild(hpBg);
    
    // HP Bar
    this.hpBar = new PIXI.Graphics();
    this.hpBar.beginFill(0xff0000);
    this.hpBar.drawRoundedRect(2, 2, 296, 21, 3);
    this.hpBar.endFill();
    this.hudLayer.addChild(this.hpBar);
    
    // HP Text
    const hpText = new PIXI.Text('HP: 100/100', {
      fontFamily: 'Arial',
      fontSize: 14,
      fill: 0xffffff,
      stroke: 0x000000,
      strokeThickness: 3
    });
    hpText.position.set(5, 3);
    this.hudLayer.addChild(hpText);
    
    // SP Bar Background
    const spBg = new PIXI.Graphics();
    spBg.beginFill(0x333333);
    spBg.drawRoundedRect(0, 35, 300, 20, 5);
    spBg.endFill();
    this.hudLayer.addChild(spBg);
    
    // SP Bar
    this.spBar = new PIXI.Graphics();
    this.spBar.beginFill(0x0000ff);
    this.spBar.drawRoundedRect(2, 37, 296, 16, 3);
    this.spBar.endFill();
    this.hudLayer.addChild(this.spBar);
    
    // SP Text
    const spText = new PIXI.Text('SP: 50/50', {
      fontFamily: 'Arial',
      fontSize: 12,
      fill: 0xffffff,
      stroke: 0x000000,
      strokeThickness: 3
    });
    spText.position.set(5, 38);
    this.hudLayer.addChild(spText);
    
    // EXP Bar
    const expBg = new PIXI.Graphics();
    expBg.beginFill(0x333333);
    expBg.drawRoundedRect(0, 60, 300, 15, 5);
    expBg.endFill();
    this.hudLayer.addChild(expBg);
    
    this.expBar = new PIXI.Graphics();
    this.expBar.beginFill(0xffd700);
    this.expBar.drawRect(2, 62, 296, 11);
    this.expBar.endFill();
    this.hudLayer.addChild(this.expBar);
    
    // Level & Job
    this.levelText = new PIXI.Text('Lvl: 1', {
      fontFamily: 'Arial',
      fontSize: 32,
      fill: 0xffff00,
      stroke: 0x000000,
      strokeThickness: 4
    });
    this.levelText.position.set(320, -5);
    this.hudLayer.addChild(this.levelText);
    
    this.jobText = new PIXI.Text('Novice', {
      fontFamily: 'Arial',
      fontSize: 20,
      fill: 0xcccccc,
      stroke: 0x000000,
      strokeThickness: 3
    });
    this.jobText.position.set(320, 25);
    this.hudLayer.addChild(this.jobText);
  }

  private createDamageLayer() {
    this.damageLayer = new PIXI.Container();
    this.container.addChild(this.damageLayer);
  }

  private createSkillWheel() {
    this.skillWheel = new PIXI.Container();
    this.skillWheel.position.set(this.config.width / 2, this.config.height - 150);
    this.container.addChild(this.skillWheel);
    
    const skills = [
      { id: 'attack', icon: '⚔️', key: '1' },
      { id: 'heal', icon: '💚', key: '2' },
      { id: 'rage', icon: '😡', key: '3' },
      { id: 'charge', icon: '💨', key: '4' }
    ];
    
    const radius = 60;
    const centerX = 0;
    const centerY = 0;
    
    skills.forEach((skill, index) => {
      const angle = (index / skills.length) * Math.PI * 2 - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      const skillBtn = new PIXI.Container();
      skillBtn.position.set(x, y);
      
      // Button background
      const btnBg = new PIXI.Graphics();
      btnBg.beginFill(0x444444);
      btnBg.drawCircle(30, 30, 30);
      btnBg.endFill();
      btnBg.eventMode = true;
      btnBg.cursor = 'pointer';
      
      // Hover effect
      btnBg.on('pointerover', () => {
        btnBg.tint = 0x666666;
      });
      btnBg.on('pointerout', () => {
        btnBg.tint = 0xffffff;
      });
      
      // Click handler
      btnBg.on('pointerdown', () => {
        this.onSkillClick?.(skill.id);
      });
      
      skillBtn.addChild(btnBg);
      
      // Icon
      const icon = new PIXI.Text(skill.icon, {
        fontFamily: 'Arial',
        fontSize: 24
      });
      icon.position.set(18, 18);
      skillBtn.addChild(icon);
      
      // Key hint
      const keyText = new PIXI.Text(skill.key, {
        fontFamily: 'Arial',
        fontSize: 14,
        fill: 0xffffff
      });
      keyText.position.set(35, 0);
      skillBtn.addChild(keyText);
      
      this.skillButtons.set(skill.id, skillBtn);
      this.skillWheel.addChild(skillBtn);
    });
  }

  private createChat() {
    this.chatLayer = new PIXI.Container();
    this.chatLayer.position.set(20, this.config.height - 200);
    this.container.addChild(this.chatLayer);
    
    // Chat message area (top of chat)
    this.chatMessage = new PIXI.Text('', {
      fontFamily: 'Arial',
      fontSize: 14,
      fill: 0xcccccc,
      align: 'left',
      wordWrap: true,
      wordWrapWidth: 300
    });
    this.chatMessage.y = 60;
    this.chatLayer.addChild(this.chatMessage);
  }

  updateHUD(state: Partial<HUDState>) {
    this.hudState = { ...this.hudState, ...state };
    
    // Update HP bar
    const hpPercent = this.hudState.hp / this.hudState.maxHp;
    this.hpBar.width = 296 * hpPercent;
    
    // Update SP bar
    const spPercent = this.hudState.sp / this.hudState.maxSp;
    this.spBar.width = 296 * spPercent;
    
    // Update EXP bar
    const expPercent = this.hudState.exp / this.hudState.nextExp;
    this.expBar.width = 296 * expPercent;
    
    // Update text
    this.levelText.text = `Lvl: ${this.hudState.level}`;
    this.jobText.text = this.hudState.job;
  }

  showDamageNumber(x: number, y: number, damage: number, isCritical: boolean) {
    const text = new PIXI.Text(`${damage}`, {
      fontFamily: 'Arial',
      fontSize: isCritical ? 36 : 24,
      fill: isCritical ? 0xff0000 : 0xffffff,
      stroke: 0x000000,
      strokeThickness: 4
    });
    
    text.position.set(x, y);
    text.anchor.set(0.5, 0);
    
    this.damageLayer.addChild(text);
    
    // Animate
    let alpha = 1;
    let yOffset = 0;
    
    const animate = () => {
      alpha -= 0.02;
      yOffset -= 0.5;
      text.alpha = alpha;
      text.y += yOffset;
      
      if (alpha > 0) {
        requestAnimationFrame(animate);
      } else {
        this.damageLayer.removeChild(text);
      }
    };
    
    animate();
  }

  showFloatingText(x: number, y: number, text: string, color: number = 0xffffff) {
    const floatText = new PIXI.Text(text, {
      fontFamily: 'Arial',
      fontSize: 20,
      fill: color,
      stroke: 0x000000,
      strokeThickness: 3
    });
    
    floatText.position.set(x, y);
    floatText.anchor.set(0.5, 0);
    
    this.damageLayer.addChild(floatText);
    
    // Fade out
    let alpha = 1;
    const fade = () => {
      alpha -= 0.02;
      floatText.alpha = alpha;
      floatText.y -= 0.3;
      
      if (alpha > 0) {
        requestAnimationFrame(fade);
      } else {
        this.damageLayer.removeChild(floatText);
      }
    };
    
    fade();
  }

  updateCooldown(skillId: string, percent: number) {
    let overlay = this.cooldownOverlays.get(skillId);
    const skillBtn = this.skillButtons.get(skillId);
    
    if (!skillBtn) return;
    
    if (percent > 0) {
      if (!overlay) {
        overlay = new PIXI.Graphics();
        overlay.beginFill(0x000000, 0.7);
        this.skillButtons.set(skillId, skillBtn);
        this.cooldownOverlays.set(skillId, overlay);
        skillBtn.addChild(overlay);
      }
      
      // Draw circular cooldown
      const radius = 30;
      overlay.clear();
      overlay.beginFill(0x000000, 0.7);
      overlay.drawCircle(radius, radius, radius * percent);
      overlay.endFill();
    } else {
      if (overlay) {
        overlay.clear();
      }
    }
  }

  addChatMessage(message: string, color: number = 0xcccccc) {
    this.chatMessage.text = message;
    this.chatMessage.style.fill = color;
  }

  setOnSkillClick(callback: (skillId: string) => void) {
    this.onSkillClick = callback;
  }

  setOnTargetSelect(callback: (targetId: string) => void) {
    this.onTargetSelect = callback;
  }

  get PIXIApp(): PIXI.Application {
    return this.app;
  }

  destroy() {
    this.app.destroy(true);
  }
}
