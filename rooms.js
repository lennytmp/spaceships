function BaseRoom(title, type, hp) {
  this.title = title;
  this.type = type;
  this.hp = hp;
  this.maxHp = this.hp;
  this.level = 0;
  this.crew = [];
  this.upgradesPerLevel = [];
}

function BaseEnergyConsumerRoom(demand) {
  this.energyDemand = demand;
  this.energy = 0;
}

BaseEnergyConsumerRoom.updateProperties = function(ship) {
  if (this.hp == 0) {
    ship.freeEnergy += this.energy;
    this.energy = 0;
  }
}

function BaseActionRoom(reloadRate) {
  this.lastProgressUpdateAt = 0;
  this.progress = 0;
  this.maxReloadRate = reloadRate;
  this.reloadRate = 0;

  this.resetTimers = function() {
    let now = Date.now();
    if (this.lastProgressUpdateAt !== undefined) {
      this.lastProgressUpdateAt = now;
    }
  }
}

BaseActionRoom.updateProperties = function(ship) {
  this.reloadRate = Math.round(this.maxReloadRate*this.energy/this.energyDemand);
}

function BaseWeaponRoom(damage) {
  this.maxDamage = damage;
  this.damage = 0;
  this.targetId = -1;
}

BaseWeaponRoom.updateProperties = function(ship) {
  this.damage = Math.round(this.maxDamage*(this.hp/this.maxHp));
  if (this.hp > 0 && this.damage == 0) {
    this.damage = 1;
  }
}

function LaserRoom() {
  BaseRoom.call(this, "Laser", WEAPON_CLASS, HP_UNIT);
  BaseEnergyConsumerRoom.call(this, 3);
  BaseActionRoom.call(this, 5);
  BaseWeaponRoom.call(this, HP_UNIT);

  this.upgradesPerLevel = [
    new Upgrade(100, 100, {maxReloadRate: 1}),
    new Upgrade(300, 300, {maxHp: HP_UNIT}),
    new Upgrade(600, 150, {maxReloadRate: 1}),
  ];
  this.upgrade = this.upgradesPerLevel[this.level];
}

function MinigunRoom() {
  BaseRoom.call(this, "Minigun", WEAPON_CLASS, HP_UNIT);
  BaseEnergyConsumerRoom.call(this, 2);
  BaseActionRoom.call(this, 10);
  BaseWeaponRoom.call(this, 2);

  this.upgradesPerLevel = [
    new Upgrade(100, 100, {maxDamage: 1}),
    new Upgrade(300, 300, {maxHp: HP_UNIT}),
    new Upgrade(600, 150, {maxDamage: 1}),
  ];
  this.upgrade = this.upgradesPerLevel[this.level];
}

function ShieldRoom() {
  BaseRoom.call(this, "Shield", SHIELD_CLASS, HP_UNIT);
  BaseEnergyConsumerRoom.call(this, 3);
  BaseActionRoom.call(this, 5);

  this.maxMaxShield = HP_UNIT;

  this.upgradesPerLevel = [
    new Upgrade(100, 1000, {maxMaxShield: 1}),
    new Upgrade(200, 2000, {maxReloadRate: 1}),
    new Upgrade(500, 3500, {maxHp: HP_UNIT}),
  ];
  this.upgrade = this.upgradesPerLevel[this.level];

  // Fight specific
  this.maxShield = 0;
  this.shield = 0;
  this.curShield = 0;
}

function ReactorRoom() {
  BaseRoom.call(this, "Reactor", ENERGY_PROVIDER_CLASS, HP_UNIT);

  this.maxEnergySupply = 3;
  this.upgradesPerLevel = [
    new Upgrade(100, 200, {maxEnergySupply: 1}),
    new Upgrade(300, 150, {maxHp: HP_UNIT}),
    new Upgrade(200, 400, {maxEnergySupply: 1}),
    new Upgrade(400, 800, {maxEnergySupply: 1}),
    new Upgrade(1000, 300, {maxHp: HP_UNIT}),
  ];
  this.upgrade = this.upgradesPerLevel[this.level];

  // Fight specific
  this.energySupply = 0;
}

function OxygenRoom() {
  BaseRoom.call(this, "Oxygen Generator", OXYGEN_CLASS, HP_UNIT);
  BaseEnergyConsumerRoom.call(this, 2);

  this.maxCapacity = 1;
  this.crew = [
    new CrewMember()
  ];

  // Fight specific
  this.capacity = 0;
}

LaserRoom.prototype.updateProperties = function(ship) {
  BaseEnergyConsumerRoom.updateProperties.call(this, ship);
  BaseActionRoom.updateProperties.call(this, ship);
  BaseWeaponRoom.updateProperties.call(this, ship);
}

MinigunRoom.prototype.updateProperties = function(ship) {
  BaseEnergyConsumerRoom.updateProperties.call(this, ship);
  BaseActionRoom.updateProperties.call(this, ship);
  BaseWeaponRoom.updateProperties.call(this, ship);
}

ShieldRoom.prototype.updateProperties = function(ship) {
  BaseEnergyConsumerRoom.updateProperties.call(this, ship);
  BaseActionRoom.updateProperties.call(this, ship);
  if (this.hp == 0) {
    this.curShield = 0;
  }
  this.maxShield = Math.round(this.maxMaxShield*(this.hp/this.maxHp));
  if (this.curShield > this.maxShield) {
    this.curShield = this.maxShield;
  }
}

ReactorRoom.prototype.updateProperties = function(ship) {
  let before = this.energySupply;
  this.energySupply = Math.round(this.maxEnergySupply*(this.hp/this.maxHp));
  ship.freeEnergy += this.energySupply - before;
}

OxygenRoom.prototype.updateProperties = function(ship) {
  this.capacity = Math.round(this.maxCapacity*(this.hp/this.maxHp));
}

function createRoom(title) {
  let r;
  switch (title) {
    case 'Minigun':
      r = new MinigunRoom();
      break;
    case 'Laser':
      r = new LaserRoom();
      break;
    case 'Reactor':
      r = new ReactorRoom();
      break;
    case 'Shield':
      r = new ShieldRoom();
      break;
    case 'Oxygen Generator':
      r = new OxygenRoom();
      break;
  }
  return r;
}

function loadRoomFrom(data) {
  var room = createRoom(data.title);
  for (key in data) {
    if (typeof data[key] !== 'object') {
      room[key] = data[key];
    }
  }
  room.crew = [];
  for (i in data.crew) {
    room.crew.push(CrewMember.loadFrom(data.crew[i]));
  }
  room.upgradesPerLevel = [];
  for (i in data.upgradesPerLevel) {
    let upgrade = data.upgradesPerLevel[i];
    room.upgradesPerLevel.push(Upgrade.loadFrom(upgrade)); 
  }
  room.upgrade = room.upgradesPerLevel[room.level];
  if (room.loadFrom !== undefined) {
    room.loadFrom(data);
  }
  return room;
}

