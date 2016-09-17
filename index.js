var request = require("request");
var Service, Characteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory("homebridge-homeds-http-lock", "HomeDSHttpLock", HomeDSAccessory);
}

function HomeDSAccessory(log, config) {
  this.log = log;
  this.name = config["name"];
  this.poolingInterval = config["poolingInterval"];;
  this.stateUrl = config["stateUrl"];
  this.lockUrl = config["lockUrl"];
  this.unlockUrl = config["unlockUrl"];
  this.onlyUnlock = true;
  this.isClosed = undefined;

  this.service = new Service.LockMechanism(this.name,this.name);

  this.service
    .getCharacteristic(Characteristic.LockCurrentState)
    .on('get', this.getState.bind(this));

  this.service
    .getCharacteristic(Characteristic.LockTargetState)
    .on('get', this.getState.bind(this))
    .on('set', this.setState.bind(this));

    this.init();

}

HomeDSAccessory.prototype = {
  init: function() {

    this.log('init');

    this.infoService = new Service.AccessoryInformation();
    this.infoService
      .setCharacteristic(Characteristic.Manufacturer, "HomeDS")
      .setCharacteristic(Characteristic.Model, "HTTP Door Lock")
      .setCharacteristic(Characteristic.SerialNumber, "Version 0.0.1");


    setTimeout(this.monitorState.bind(this), this.poolingInterval);

  },
  monitorState: function() {

      request.get({
        url: this.stateUrl
      }, function(err, response, body) {

        if (!err && response.statusCode == 200) {
          // var json = JSON.parse(body);
          // var state = json.state; // "lock" or "unlock"
          // var state = body;

          var curState = (body == 'lock') ? true : false;

          // this.log("Current status: %s", curState);
          // this.log("Current state: %s", this.isClosed);

          if (curState != this.isClosed) {

            this.log("Lock state is change to %s - %s", curState, this.isClosed);

            this.isClosed = curState;

            this.service
             .setCharacteristic(Characteristic.LockCurrentState, this.isClosed);

            this.service
             .setCharacteristic(Characteristic.LockTargetState, this.isClosed);
          }

        } else {
          this.log('Server error');
          // this.log("Error getting state (status code %s): %s", response.statusCode, err);
        }

      }.bind(this));

      setTimeout(this.monitorState.bind(this), this.poolingInterval);

  },
  getState: function(callback) {

      request.get({
        url: this.stateUrl
      }, function(err, response, body) {

        if (!err && response.statusCode == 200) {
          // var json = JSON.parse(body);
          // var state = json.state; // "lock" or "unlock"
          // var state = body;

          this.log("Lock state is %s", body);
          var curState = (body == 'lock') ? true : false;

          this.isClosed = curState;

          callback(null, curState);
        }
        else {
          this.log('Server error');
          callback(err);
        }
      }.bind(this));

    },
  setState: function(state, callback) {

    this.log('Set state - '+state);

    if (state === 0) { //Unlock
      this.log('unlock');

        request.get({
          url: this.unlockUrl
        }, function(err, response, body) {

          if (!err && response.statusCode == 200) {
            this.isClosed = false;
            this.service.setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.UNSECURED);

            callback(null);
          }
          else {
            this.log('Server error');
            this.isClosed = undefined;
            callback(null);
          }
        }.bind(this));

    // } else if (state === 1) { //Lock
    //   this.log('set lock');
    //   // this.isClosed = false;
    //   callback(null);
    } else {
      this.log('set undef');

      this.service
        .setCharacteristic(Characteristic.LockCurrentState, this.isClosed);


      callback(null);
    }

    // if (state == 0) { //Unlock
    //   this.log('Unlock state');
    //
    //   request.get({
    //     url: "http://localhost:3000/unlock"
    //   }, function(err, response, body) {
    //
    //     if (!err && response.statusCode == 200) {
    //       this.isClosed = false;
    //       this.service.setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.UNSECURED);
    //
    //       callback(null);
    //     }
    //     else {
    //       this.log('Server error');
    //       this.isClosed = undefined;
    //       callback(err);
    //     }
    //   }.bind(this));
    //
    // } else if (state == 1) { //lock
    //   this.log('Lock');
    //   this.isClosed = false;
    //   // this.service.setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.UNSECURED);
    //   this.service
    //    .setCharacteristic(Characteristic.LockCurrentState, this.isClosed);
    //
    //   this.service
    //    .setCharacteristic(Characteristic.LockTargetState, this.isClosed);
    //   callback(null);
    // }

    // this.isClosed = undefined;
    // callback(null);

    // var lockitronState = (state == Characteristic.LockTargetState.SECURED) ? "lock" : "unlock";
    //
    // this.log("Set state to %s", lockitronState);
    //
    // var currentState = (state == Characteristic.LockTargetState.SECURED) ?
    //   Characteristic.LockCurrentState.SECURED : Characteristic.LockCurrentState.UNSECURED;
    //
    // this.service
    //   .setCharacteristic(Characteristic.LockCurrentState, currentState);
    //
    // callback(null);
    //
    // this.log("State change complete.");

    // request.put({
    //   url: "https://api.lockitron.com/v2/locks/"+this.lockID,
    //   qs: { access_token: this.accessToken, state: lockitronState }
    // }, function(err, response, body) {

    //   if (!err && response.statusCode == 200) {
    //     this.log("State change complete.");

    //     // we succeeded, so update the "current" state as well
    //     var currentState = (state == Characteristic.LockTargetState.SECURED) ?
    //       Characteristic.LockCurrentState.SECURED : Characteristic.LockCurrentState.UNSECURED;

    //     this.service
    //       .setCharacteristic(Characteristic.LockCurrentState, currentState);

    //     callback(null); // success
    //   }
    //   else {
    //     this.log("Error '%s' setting lock state. Response: %s", err, body);
    //     callback(err || new Error("Error setting lock state."));
    //   }
    // }.bind(this));
  }

}

HomeDSAccessory.prototype.getServices = function() {
  return [this.infoService, this.service];
}
