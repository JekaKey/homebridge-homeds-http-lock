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
  this.poolingInterval = parseInt(config["poolingInterval"]);

  if (this.poolingInterval < 0) {
  	this.poolingInterval = 1000;
  }

  this.stateUrl = config["stateUrl"];
  this.lockUrl = config["lockUrl"];
  this.unlockUrl = config["unlockUrl"];
  this.method = config["method"];
  this.debug = config["debug"];

  this.isClosed = undefined;

  if (this.method == undefined) {this.method = 'get'}

  this.service = new Service.LockMechanism(this.name,this.name);

  this.service
    .getCharacteristic(Characteristic.LockCurrentState)
    .on('get', this.getCurState.bind(this));
    // .on('set', this.setCurState.bind(this));

  this.service
    .getCharacteristic(Characteristic.LockTargetState)
    .on('get', this.getCurState.bind(this))
    .on('set', this.setTarState.bind(this));

    this.init();

}

HomeDSAccessory.prototype = {
  init: function() {

    this.log('Init HomeDSHttpLock');

    this.infoService = new Service.AccessoryInformation();
    this.infoService
      .setCharacteristic(Characteristic.Manufacturer, "HomeDS")
      .setCharacteristic(Characteristic.Model, "HTTP Door Lock")
      .setCharacteristic(Characteristic.SerialNumber, "Version 0.0.1");


    setTimeout(this.monitorState.bind(this), this.poolingInterval);

  },
  getCurState: function(callback) {
  	this.log('getCurState');
  	callback(null, this.isClosed);

  },
  setCurState: function(state, callback) {
  	this.isClosed = state;
  	callback(null, this.isClosed);
  },
  getTarState: function(callback) {
  	this.log('getTarState');

    setTimeout(function() {
      callback(null, this.isClosed);
    },2000);
  	
  },
  setTarState: function(state, callback) {
  	this.log('Set state - ' + state);
  	this.log('setTarState');

  	// this.service.setCharacteristic(Characteristic.LockCurrentState, state);

  	var url = (state == true) ? this.lockUrl : this.unlockUrl;

    if (this.isClosed == state) {
      console.log('State equel');
      callback(null,state);
    } else {
          request[this.method]({
          url: url
        }, function(err, response, body) {

          if (!err && response.statusCode == 200) {
            this.isClosed = state;
            this.service.setCharacteristic(Characteristic.LockCurrentState, state);

            callback(null,state);
          }
          else {
            this.log('Http server return error');
            this.service.setCharacteristic(Characteristic.LockCurrentState, state);
            callback(null,state);
          }
        }.bind(this));
    }

  	
  },
  monitorState: function() {

      request[this.method]({
        url: this.stateUrl
      }, function(err, response, body) {

        if (!err && response.statusCode == 200) {
          // var json = JSON.parse(body);
          // var state = json.state; // "lock" or "unlock"
          // var state = body;

          body = JSON.parse(body);

          var curState = (body.result.toLowerCase() == 'lock') ? true : false;

          this.log("Current status: %s", curState);
          // this.log("Current state: %s", this.isClosed);

          if (curState != this.isClosed) {

            this.log("Lock state is change to %s from  %s", curState, this.isClosed);

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

  }

}

HomeDSAccessory.prototype.getServices = function() {
  return [this.infoService, this.service];
}
