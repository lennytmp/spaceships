function FightStatus(lvl) {
  let now = Date.now();
  this.now = now;
  this.start = now;
  this.end = now + MAX_FIGHT_TICKS*1000*(lvl*0.5+1);
  this.mySurrender = false;
}

FightStatus.prototype.min = function() {
  let d = (this.end - this.now)/1000;
  return Math.floor(d/60);
}

FightStatus.prototype.sec = function() {
  let d = (this.end - this.now)/1000;
  return Math.round(d - this.min()*60);
}


function progressFight(myShip, enemy, fightStatus, callback) {
  if (fightStatus.mySurrender) {
    alert("You lost!");
    myShip.rating = Math.round(myShip.rating*0.33);
    for (let id in myShip.rooms) {
      myShip.rooms[id].hp = 0;
    }
    callback();
    return;
  }
  if (fightStatus.now > fightStatus.end) {
    alert("Draw due to timeout!");
    myShip.rating = Math.round(myShip.rating*0.4);
    callback();
    return;
  }
  enemy.redistributeEnergy();
  myShip.redistributeEnergy();
  enemyDamage = myShip.getTargetsDamage();
  myDamage = enemy.getTargetsDamage();
  enemy.applyDamage(enemyDamage);
  myShip.applyDamage(myDamage);
  if (enemy.checkDead()) {
    alert("You won!");
    for (type in enemy.resources) {
      myShip.resources[type] += enemy.resources[type];
    }
    myShip.rating *= 2;
    callback();
    return;
  }
  if (myShip.checkDead()) {
    alert("You lost!");
    myShip.rating = Math.round(myShip.rating*0.33);
    callback();
    return;
  }
  myShip.setNewTargetsIfNeeded(enemy);
  enemy.setNewTargetsIfNeeded(myShip);

  setTimeout(function() {
      fightStatus.now = Date.now();
      progressFight(myShip, enemy, fightStatus, callback);
    }, FIGHT_RESOLUTION_MS);
}

function generateEnemy(rating) {
  let enemy = new Ship();
  enemy.addRoom(new ReactorRoom());
  investRandomly(enemy, rating);
  return enemy;
}

function investRandomly(ship, rating) {
  for (resType in ship.resources) {
    ship.resources[resType] = rating;
  }
  let options = ship.getIvenstmentOptions();
  while (options.length > 0) {
    let randChoice = pickRandomEl(options);
    randChoice.value.apply();
    options = ship.getIvenstmentOptions();
  }
  for (resType in ship.resources) {
    ship.resources[resType] = Math.round(rand_bm(60*(ship.level+1), 100*(ship.level+1), 1));
  }
}
