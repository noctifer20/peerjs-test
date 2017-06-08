import Http from './Http';
import Player from './Player';
import Peer from 'peerjs';
import util from 'peerjs/lib/util';
import PeerUI from './PeerUI';
import Event from './Event';
import PeerConnnection from './PeerConnection';

class Together {
  constructor(key, room_id) {
    console.trace('TOGETHER START');

    this.debug = true;

    this.key = key;
    this.peers = [];
    this.peersProps = [];
    this.peerIDs = [];
    this.mediaConfig = {
      audio: true, //!this.debug,
      video: {
        width: {min: 32, ideal: 128, max: 328},
        height: {min: 32, ideal: 128, max: 328},
        //frameRate: { ideal: 20, max: 25 }
      }
    };
    this.dataOptions = {
      reliable: false,
      serialization: 'binary'
    };

    // this._player = new Player();
    this.$http = new Http('https://dev.castly.tv');

    this.connect(room_id);

    Event.on('command', this.onCommand);
    Event.on('playerEvent', this.onPlayerEvent);
    window.onbeforeunload = this.disconnect;

    PeerUI.init();
  }

  onPeerConnected = (peer) => {
    console.trace('PEER CONNECTED');

    this._player.pause();
    const position = this._player.getPosition();
    console.log('POSITION IS ', position);
    peer.send('seek', {
      position
    });
  };

  onPeerDisconnected = () => {
    console.trace('PEER DISCONNECTED');
  };

  onConnectedToPeer = (peer) => {
    console.trace('CONNECTED TO PEER');

    this._player.pause();
  };

  onCommand = (command) => {
    console.trace('GOT DATA FROM PEER', command);

    switch (command.name) {
      case 'seek':
        this._player.pause();
        this._player.seek(command.data.position).then(() => {
          command.sender.send('ready');
        });
        break;
      case 'ready':
        //this._player.runOnReady(() => {
        command.sender.send('play');
        this._player.play();
        // });
        break;
      case 'play':
        this._player.play();
        break;
      case 'pause':
        this._player.pause();
        break;
    }
  };

  onPlayerEvent = (event) => {
    console.trace('GOT PLAYER EVENT', event);

    console.log(this.peers);
    switch (event.name) {
      case 'seek':
        if (!this.peerIDs.length)
          return;
        this._player.pause();
        this.peerIDs.forEach(id => this.peers[id] && this.peers[id].send('seek', {position: event.position}));
        break;
      case 'play':
        this.peerIDs.forEach(id => this.peers[id] && this.peers[id].send('play'));
        break;
      case 'pause':
        this.peerIDs.forEach(id => this.peers[id] && this.peers[id].send('pause'));
        break;
    }
  };

  connect(roomID) {
    this.roomID = roomID;
    this.uuid().then((value) => {
      this.userID = value;
      return this.auth();
    }).then((value) => {
      var obj = JSON.parse(value);
      this.id = obj.uniqueID;
      this.peerIDs = obj.peersInRoom.map((p) => {
        return p.uniqueID;
      });

      return this.getStream(obj);
    }).then((value) => {
      const myPeer = {
        id: this.id,
        stream: value.stream,
        video: value.video,
        audio: value.audio
      };

      // TODO: open this shit
      this.myUI = new PeerUI(myPeer, {scale: 128, self: true}, this.peersProps);

      this.initConnection(value);
    }).catch((err) => {
      console.error(err);

      switch (err) {
        case 'Invalid API key provided':
          PeerUI.showError(err,
            'Either there is a type error in your given key or it is not anymore valid. Please contact us to resolve the problem.');
          break;
        case 'NavigatorUserMediaError':
          PeerUI.showError('Navigator User Media Error',
            'The problem is connected with your camera/microphone. Please check if everything is connected and refresh.');
          break;
        case 'DevicesNotFoundError':
          PeerUI.showError('Devices Not Found Error',
            'The problem is connected with your camera/microphone. Please check if everything is connected and refresh.');
          break;
        case 'Browser':
          PeerUI.showError('Change your Browser',
            'Please download the latest version of Chrome browser and reload the page.');
          break;
        case 'Update your browser':
          PeerUI.showError(err,
            'Please download the latest version of Chrome browser and reload the page.');
          break;
        case 'NotAllowedError':
          PeerUI.showError('Allow access to your Camera/Microphone',
            'To use video calling, you need to give permission on your camera and microphone during the call. Afterwards, please refresh the page.');
          break;
        case 'PermissionDeniedError':
          PeerUI.showError('Allow access to your Camera/Microphone',
            'To use video calling, you need to give permission on your camera and microphone during the call. Afterwards, please refresh the page.');
          break;
        default:
          PeerUI.showError('Error', err);
      }
    });
  }

  uuid() {
    return this.$http.get('/uuid', {'key': this.key});
  }

  auth() {
    const payload = {
      'key': this.key,
      'roomID': this.roomID,
      'url': window.location.href
    };
    if (this.userID != '' && this.userID != null && this.userID != undefined) {
      payload.userID = this.userID;
    }

    return this.$http.get('/connect', payload);
  }

  getStream(obj) {
    const promise = new Promise((resolve, reject) => {
      var version = parseInt(this.getBrowserVersion()[1].split('.'));
      if (util.browser != 'Chrome') {
        reject('Browser');
      }

      if (util.browser == 'Chrome' && version < 48) {
        reject('Update your browser');
      }

      if (!util.supports.audioVideo || !util.supports.data || !util.supports.reliable) {
        reject('Update your browser');
      }

      navigator.mediaDevices.getUserMedia(this.mediaConfig)
        .then((stream) => {
          obj.stream = stream;
          resolve(obj);
        })
        .catch((error) => {
          obj.stream = false;
          resolve(obj);
        });
    });

    return promise;
  }

  initConnection(value) {
    this.peer = new Peer(this.id, {
      //key: 'bub9icufkr19k9',
      debug: this.debug ? 3 : 0,
      secure: true,//this.debug? false:true,
      // config: value.stunTurnConfig,
      host: value.host.host,
      port: value.host.port,
      path: value.host.path,
    });
    this.peer.stream = value.stream;


    this.peer.on('open', (id) => {
      console.trace('CONNECTED TO PEER.JS SERVER', id);

      this.connectToPeers();

      this.peer.on('disconnected', (peer) => {
        console.log('PEER DISCONNECTED', peer);

        this.peer.reconnect();
      });

    });
    // this.peer.on('connection', (conn) => {
    //   console.trace('RECEIVING PEER CONNECTION');
    //
    //   this.setupConnections(conn);
    // });
    this.peer.on('call', this.setupCall);

    this.peer.on('error', err => console.error(err));
  }

  setupConnections(conn) {
    if (this.peerIDs.indexOf(conn.peer) < 0) {
      this.peerIDs.push(conn.peer);
      this.peers[conn.peer] = new PeerConnnection(conn.peer, this.peer, this.dataOptions, this.streamOptions, this.peersProps);
    }

    this.peers[conn.peer].setupConnection(conn, () => {
      this.onPeerConnected(this.peers[conn.peer]);
    });
  }

  connectToPeers() {
    console.trace('CONNECTING TO PEERS');

    this.peerIDs.filter((id) => {
      return this.peer.connections[id] === undefined;
    }).forEach((id) => {
      var p = new PeerConnnection(id, this.peer, this.dataOptions, this.streamOptions, this.peersProps);

      p.connectTo(() => {
        console.warn('CONNECTED TO PEER', id);

        this.peers[id] = p;
        // this.syncMe.bind(this)(id);
        this.onConnectedToPeer(p);

      });
    })
  }

  destroyPlayerEvents() {
    console.warn("DESTROY EVENTS");
    this.player.onplay = () => {
    };
    this.player.onpause = () => {
    };
    this.player.onseeked = () => {
    };
  }

  initPlayerEvents() {
    console.warn("INIT EVENTS");
    this.player.onplay = () => {
      this.sync('play', {now: Date.now(), cur: this.player.currentTime, seeked: true, playing: true});
    };
    this.player.onpause = () => {
      this.sync('play', {now: Date.now(), cur: this.player.currentTime, seeked: true, playing: false});
    };
    this.player.onseeked = () => {
      console.log('onseeked', this.player.seeking)
      this.sync('play', {now: Date.now(), cur: this.player.currentTime, seeked: false, playing: true});

    };
  }

  menu() {
    PeerUI.showMenu();
    this.peer.menuOn = true;
  }

  disconnect = () => {
    var payload = {
      key: this.key,
      roomID: this.roomID,
      uniqueID: this.id,
    };
    console.log('payload', payload);

    this.$http
      .get('/disconnect', payload, true)
      .then((value) => {
        var obj = JSON.parse(value);
        console.log(obj.result)
      })
      .catch((err) => {
        console.log(err);
      });

    var eventName = 'disconnect_me';
    var data = {
      name: 'disconnect_me',
      master: this.id,
      type: 'disconnect',
    }

    this.peerIDs.filter((id) => {
      return this.peer.connections[id] != undefined && this.peers[id] != undefined;
    }).forEach((id) => {
      this.peers[id].send(eventName, data);
    });
  }


  getBrowserVersion() {
    var N = navigator.appName, ua = navigator.userAgent, tem;
    var M = ua.match(/(opera|chrome|safari|firefox|msie)\/?\s*(\.?\d+(\.\d+)*)/i);
    if (M && (tem = ua.match(/version\/([\.\d]+)/i)) != null) M[2] = tem[1];
    M = M ? [M[1], M[2]] : [N, navigator.appVersion, '-?'];
    return M;
  }

  syncMe(id) {
    if (this.firstConnected == true && this.peers[id]) {
      //Sync me
      var data = {
        type: 'sync_me',
      }
      this.peers[id].send('sync_me', data);
      this.firstConnected = false;
    }

  }


  setupCall = call => {
    if (this.debug) console.log("setup Call " + call.peer);
    //Add new peer
    if (this.peerIDs.indexOf(call.peer) < 0) {
      this.peerIDs.push(call.peer);
      this.peers[call.peer] = new PeerConnnection(call.peer, this.peer, this.dataOptions, this.streamOptions, this.peersProps);
    }

    call.answer(this.peer.stream);
    //console.log(this.peersProps);
    this.peers[call.peer].setupCall(call, this.peersProps);
  }

  initEvents() {
    Event.on('peer_destroy', (id) => {
      var index = this.peerIDs.indexOf(id);
      if (index > -1) {
        delete this.peersProps[this.peerIDs[index]];
        this.peerIDs.splice(index, 1);
      }

      delete this.peers[id];
    });
  }

  sync(eventName, eventData) {
    var actionID = Math.random().toString(36).substring(7);
    var data = {
      name: eventName,
      data: eventData,
      master: this.id,
      type: 'prepare',
      actionID: actionID,
    }
    //console.log(this.peers);

    this.peerIDs.filter((id) => {
      //console.log(this.peer);
      return this.peer.connections[id] != undefined && this.peers[id] != undefined;
    }).forEach((id) => {
      var peer = this.peers[id];

      peer.action[actionID] = {};
      peer.action[actionID].ready = false;
      peer.send(eventName, data);
    });


    //Send my prepare event
    this.action[actionID] = {};
    this.action[actionID].ready = false;

    Event.fire('prepare' + eventName, data);

    Event.on('ready' + eventName + actionID, (event) => {
      this.isEveryoneReady(event.actionID, event);
    });
  }

  isEveryoneReady(actionID, event) {
    var allReady = true;

    //Check if everyoneIs ready
    this.peerIDs.filter((id) => {
      return this.peer.connections[id] != undefined && this.peers[id] != undefined;
    }).forEach((id) => {
      var peer = this.peers[id];

      if (peer.action[actionID].ready != true) {
        if (this.debug) console.log(peer.id + 'is not ready');
        allReady = false;
      }
    });

    if (this.action[actionID].ready != true) {
      allReady = false;
    }

    if (this.debug) console.log('everyone read:' + allReady);

    if (allReady) {
      //Get maximum ping
      var maxPing = 0;
      this.peerIDs.filter((id) => {
        return this.peer.connections[id] != undefined && this.peers[id] != undefined;
      }).forEach((id) => {
        var peer = this.peers[id];
        if (maxPing < peer.ping) {
          maxPing = peer.ping;
        }
      });

      var data = {
        name: event.name,
        master: this.id,
        type: 'act',
        data: event.data,
      }

      //Send everyone to act
      this.peerIDs.filter((id) => {
        return this.peer.connections[id] != undefined && this.peers[id] != undefined;
      }).forEach((id) => {
        var peer = this.peers[id];
        data.delay = maxPing - peer.ping,
          peer.send(event.name, data);
      });

      //Send me to act
      Event.fire('on' + event.name, data);
    }
  }

  onPrepare(eventName, callback) {
    Event.on('prepare' + eventName, (eventData) => {

      var startTime = Date.now();
      callback(eventData.data, () => {
        var data = {
          name: eventName,
          type: 'ready',
          data: eventData.data,
          preparedTime: Date.now() - startTime,
          actionID: eventData.actionID,
        }
        if (eventData.master == this.id) {
          this.action[eventData.actionID].ready = true;
          this.isEveryoneReady(eventData.actionID, eventData);
        }
        else {
          this.peers[eventData.master].send('eventName', data);
        }
      });
    });
  }

  onSyncWithMe(callback) {
    Event.on('sync_me', (data) => {
      callback();
    });
  }

  on(eventName, callback) {
    Event.on('on' + eventName, (event) => {
      //Delay a little bit
      //console.log(event.delay);
      console.log('event', event)
      setTimeout(() => {
        callback(event.data);
      }, event.delay);
    });
  }
}
export default Together;