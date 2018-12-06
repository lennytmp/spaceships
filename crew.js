function CrewMember() {
  this.maxHp = HP_UNIT;
  this.title = pickRandomEl(NAMES).value;
  this.maxDamage = 1;
  this.maxReloadRate = 25;

  this.hp = this.maxHp;
  this.reloadRate = 0;
  this.damage = 0;
  this.lastProgressUpdateAt = 0;
  this.progress = 0;
}

CrewMember.prototype.updateProperties = function(ship) {
  this.reloadRate = Math.round(this.maxReloadRate*this.hp/this.maxHp);
  this.damage = Math.round(this.maxDamage*(this.hp/this.maxHp));
  if (this.hp > 0 && this.damage == 0) {
    this.damage = 1;
  }
}

CrewMember.loadFrom = function(data) {
  let result = new CrewMember();
  for (key in data) {
    if (typeof data[key] !== 'object') {
      result[key] = data[key];
    }
  }
  return result;
}

