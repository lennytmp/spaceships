function Upgrade(minerals, gas, improvements) {
  this.cost = {"minerals": minerals, "gas": gas};
  this.improvements = improvements;
}

Upgrade.loadFrom = function(data) {
  return new Upgrade(data.cost.minerals, data.cost.gas, data.improvements);
}

function Ship() {
  this.rooms = [];
  this.level = 0;
  this.maxRooms = 2;
  this.resources = {"minerals": 100, "gas": 100};
  this.maxRoomId = 0;
  this.isMine = false;
  this.rating = 199;
  // TODO: newRoomCosts should be a global?
  this.newRoomCosts = {
    'Laser': {'minerals': 200, 'gas': 200},
    'Minigun': {'minerals': 400, 'gas': 300},
    'Reactor': {'minerals': 10, 'gas': 300},
    'Shield': {'minerals': 800, 'gas': 800},
    'Oxygen Generator': {'minerals': 1000, 'gas': 1000},
  }
  this.upgrade = new Upgrade(100, 0, {maxRooms: 1});
  this.freeEnergy = 0;
}

Ship.loadFrom = function(data) {
  let ship = new Ship();
  for (key in data) {
    if (typeof data[key] !== 'object') {
      ship[key] = data[key];
    }
  }
  ship.resources = data.resources;
  ship.upgrade = Upgrade.loadFrom(data.upgrade);
  for (let id in data.rooms) {
    ship.rooms.push(loadRoomFrom(data.rooms[id]));
  }
  return ship;
}

Ship.prototype.decEnergyForRoom = function(roomId, vol) {
  let room = this.rooms[roomId];
  if (!room || room.energy < vol) {
    return;
  }
  room.energy -= vol;
  room.updateProperties(this);
  this.freeEnergy += vol;
}

Ship.prototype.incEnergyForRoom = function(roomId, vol) {
  let room = this.rooms[roomId];
  if (!room || room.hp <= 0 || this.freeEnergy < vol || room.energy + vol > room.energyDemand) {
    return;
  }
  this.freeEnergy -= vol;
  if (room.energy == 0) {
    resetTimers(room);
  }
  room.energy += vol;
  room.updateProperties(this);
}

Ship.prototype.doUpgrade =  function(upgrade, entity) {
  if (!upgrade.cost || !this.haveEnoughResources(upgrade.cost)) {
    return false;
  }
  this.chargeCost(upgrade.cost);
  for (key in upgrade.improvements) {
    entity[key] += upgrade.improvements[key];
  }
  if (entity.hp !== undefined) {
    entity.hp = entity.maxHp;
  }
  entity.level++;
  if (entity.upgradesPerLevel === undefined) {
    for (let resType in upgrade.cost) {
      upgrade.cost[resType] *= 2;
    }
  } else {
    let nextUpgrade = entity.upgradesPerLevel[entity.level];
    if (nextUpgrade !== undefined) {
      entity.upgrade = JSON.parse(JSON.stringify(nextUpgrade));
    } else {
      entity.upgrade = undefined;
    }
  }
  return true;
}

Ship.prototype.chargeCost = function(cost) {
    for (let resType in cost) {
      this.resources[resType] -= cost[resType];
    }
}

Ship.prototype.getIvenstmentOptions = function() {
  let result = [];
  let me = this;
  if (this.upgrade !== undefined && this.haveEnoughResources(this.upgrade.cost)) {
    result.push({'cost': this.upgrade.cost, 'apply': function() {
          me.doUpgrade(me.upgrade, me);
    }});
  }
  if (this.maxRooms > this.rooms.length) {
    for (let title in this.newRoomCosts) {
      let cost = this.newRoomCosts[title];
      if (this.haveEnoughResources(cost)) {
          result.push({'cost': cost, 'apply': function() {
                  me.buyRoom(title);
              }
          });
      }
    }
  }
  for (let id in this.rooms) {
    let room = this.rooms[id];
    if (room.upgrade !== undefined && this.haveEnoughResources(room.upgrade.cost)) {
      result.push({'cost': room.upgrade.cost, 'apply': function() {
              me.doUpgrade(room.upgrade, room);
      }});
    }
  }
  return result;
}

Ship.prototype.buyRoom = function(title) {
  if (!this.newRoomCosts[title]) {
    return false;
  }
  let cost = this.newRoomCosts[title];
  if (!this.haveEnoughResources(cost)) {
    return false;
  }
  let r = createRoom(title);
  if (r === undefined) {
    return false;
  }
  this.chargeCost(cost);
  this.addRoom(r);
  return true;
}

Ship.prototype.addRoom = function(room) {
  this.rooms[this.maxRoomId] = room;
  this.maxRoomId++;
}

Ship.prototype.haveEnoughResources = function(cost) {
    if (GOD_MODE && this.isMine) {
      return true;
    }
    for (let resType in cost) {
      if (this.resources[resType] < cost[resType]) {
        return false;
      }
    }
    return true;
}

Ship.prototype.initBeforeFight = function() {
  this.freeEnergy = 0;
  for (id in this.rooms) {
    let room = this.rooms[id];
    if (room.resetTimers !== undefined) {
      room.resetTimers();
    }
    if (room.progress !== undefined) {
      room.progress = 0;
    }
    if (room.shield !== undefined) {
      room.maxShield = room.maxMaxShield;
      room.shield = room.maxShield;
    }
    if (room.energySupply !== undefined) {
      room.energySupply = room.maxEnergySupply;
      this.freeEnergy += room.energySupply;
    }
    if (room.energyDemand !== undefined) {
      room.energy = 0;
    }
    if (room.targetId !== undefined) {
      room.targetId = -1;
    }
  }
}

Ship.prototype.spendFreeEnergy = function() {
  let totalEnergyDemand = 0;
  for (id in this.rooms) {
    let room = this.rooms[id];
    if (room.hp == 0) {
      continue;
    }
    if (room.energyDemand !== undefined) {
      totalEnergyDemand += room.energyDemand - room.energy;
    }
  }
  while (this.freeEnergy > 0 && totalEnergyDemand > 0) {
    for (id in this.rooms) {
      let room = this.rooms[id];
      if (room.hp == 0 || room.energyDemand === undefined || room.energy >= room.energyDemand) {
        continue;
      }
      room.energy++;
      this.freeEnergy--;
      totalEnergyDemand--;
      if (this.freeEnergy == 0 || totalEnergyDemand == 0) {
        break;
      }
    }
  }
}


Ship.prototype.redistributeEnergy = function() {
  while (this.freeEnergy < 0) {
    for (id in this.rooms) {
      let room = this.rooms[id];
      if (room.energyDemand !== undefined && room.energy > 0) {
        room.energy--;
        this.freeEnergy++;
      }
    }
  }
  if (!this.isMine) {
    this.spendFreeEnergy();
  }
  for (id in this.rooms) {
    let room = this.rooms[id];
    if (room.updateProperties !== undefined) {
      room.updateProperties(this);
    }
  }
}

Ship.prototype.setNewTargetsIfNeeded = function(enemy) {
  let possibleTargets = [];
  for (let k in enemy.rooms) {
    if (enemy.rooms[k].hp > 0) {
      possibleTargets.push(k);
    }
  }
  if (possibleTargets.length == 0) {
    throw "New target can't be chosen, the fight should have finished";
    return;
  }
  for (let k in this.rooms) {
    let room = this.rooms[k];
    if (room.type == WEAPON_CLASS) {
      if (room.targetId == -1 || enemy.rooms[room.targetId].hp <= 0) {
        room.targetId = pickRandomEl(possibleTargets).value;
      }
    }
  }
}

Ship.prototype.applyDamage = function(damage) {
  let myDamage = {};
  let now = Date.now();
  let totalShield = 0;
  let healthyShieldRooms = [];
  for (let id in this.rooms) {
    let room = this.rooms[id];
    if (room.type == SHIELD_CLASS) {
      if (room.hp <= 0) {
        continue;
      }
      healthyShieldRooms.push(room);
      room.progress += (now - room.lastProgressUpdateAt)*2*room.reloadRate/1000;
      room.lastProgressUpdateAt = now;
      if (room.progress >= 100) {
        room.progress = 0;
        room.shield = Math.min(room.shield + 1, room.maxShield);
      }
      totalShield += room.shield;
    }
  }
  let totalShieldBefore = totalShield;
  for (let id in damage) {
    let target = this.rooms[id];
    let dmg = Math.round(damage[id]);
    if (totalShield > 0) {
      let blockedByShield = Math.min(totalShield, dmg);
      totalShield -= blockedByShield;
      dmg -= blockedByShield;
    }
    target.hp -= dmg;
    if (target.hp < 0) {
      target.hp = 0;
    }
    if (target.updateProperties !== undefined) {
      target.updateProperties(this);
    }
  }
  let deltaShield = totalShieldBefore - totalShield;
  while (deltaShield > 0 && healthyShieldRooms.length > 0) {
    let randChoice = pickRandomEl(healthyShieldRooms);
    if (randChoice.value.shield > 0) {
      randChoice.value.shield--;
      deltaShield--;
    } else {
      healthyShieldRooms.splice(randChoice.index);
    }
  }
}

Ship.prototype.checkDead = function(ship) {
  for (let k in this.rooms) {
    if (this.rooms[k].hp > 0) {
      return false;
    }
  }
  return true;
}

Ship.prototype.getTargetsDamage = function() {
  let myDamage = {};
  let now = Date.now();
  for (let k in this.rooms) {
    let room = this.rooms[k];
    if (room.type == WEAPON_CLASS) {
      room.progress += (now - room.lastProgressUpdateAt)*2*room.reloadRate/1000;
      room.lastProgressUpdateAt = now;
      if (room.progress < 100) {
        continue;
      }
      room.progress = 0;
      if (room.hp <= 0) {
        continue;
      }
      if (myDamage[room.targetId] === undefined) {
        myDamage[room.targetId] = 0;
      }
      myDamage[room.targetId] += room.damage;
    }
  }
  return myDamage;
}

Ship.prototype.recoverHp = function() {
  let recovered = false;
  for (let k in this.rooms) {
    let room = this.rooms[k];
    if (room.hp < room.maxHp) {
      room.hp += 1;
      if (room.hp > room.maxHp) {
        room.hp = room.maxHp;
      }
      break;
    }
  }
}

