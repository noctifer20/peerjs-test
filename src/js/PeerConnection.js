import PeerUI from './PeerUI';
import Event from './Event';

class PeerConnection {
  constructor(id, peer, dataOptions, StreamOptions, peersProps) {
    this.id = id;
    this.peer = peer;
    this.dataOptions= dataOptions;
    this.StreamOptions;
    this.ping = 0;
    this.action = [];
    this.debug = true;
    this.peersProps = peersProps;
  }

  connectTo(callback) {
    if (this.debug) console.log('connecting with ' + this.id + '...');
    const conn = this.peer.connect(this.id.toString());
    this.setupConnection(conn, callback); //true for joining the room and not answering

    // Call a peer, providing our mediaStream
    var call = this.peer.call(this.id, this.peer.stream, this.StreamOptions)
    this.setupCall(call);
  }

  get getID() {
    return this.id;
  }

  setupConnection(conn, callback) {
    //Understand Data Passing
    this.conn = conn;
    this.conn
      .on('open', () => {
        console.warn(`CONNECTION WITH PEER ${this.id} ESTABLISHED`);
        callback();
      })
      .on('data', (command) => {
        //data.receiveTime = Date.now();
        command.sender = this;
        Event.fire('command', command);
      })
      .on('close', () => {
        this.conn.close();
        this.destroy();
      })
      .on('error', (err) => {
        console.error('Connection error', err);
      });
  }

  send(eventName, data = {}) {
    // data['sentTimeStamp'+this.peer.id] = Date.now();

    this.conn.send({name: eventName, data});
  }

  receiveData(data) {

    if (this.debug) console.log(data);
    //clean data from metadata
    switch (data.type) {
      case 'sync_me':
        Event.fire('sync_me', data);
        break;

      case 'prepare':
        Event.fire('prepare' + data.name, data);
        break;

      case 'act':
        Event.fire('on' + data.name, data);
        break;

      case 'disconnect':
        this.conn.close();
        this.call.close();
        break;

      case 'ready':
        //Calculate Average Ping
        var receiveTimeStamp = Date.now();
        this.ping = (receiveTimeStamp - data['sentTimeStamp' + this.peer.id] - data.preparedTime) / 2;
        this.action[data.actionID].ready = true;

        Event.fire('ready' + data.name + data.actionID, data);
        break;

      default:
        if (this.debug) console.log('Data sent is has no type from', data);
    }

  }

  destroy() {
    if (this.call && this.conn.open == false && this.call.open == false) {
      this.UI.destroy();
      Event.fire('peer_destroy', this.id);
    }
  }

  setupCall(call) {
    this.call = call;
    // Wait for stream on the call, then set peer video display
    this.call.on('stream', (stream) => {
      // Add new user to the UI
      var myPeer = {
        id: this.id,
        stream: stream,
      }
      this.UI = new PeerUI(myPeer, {scale: 128, self: false}, this.peersProps);
      if (this.peer.menuOn) {
        this.UI.goToMenu();
      }
    });

    this.call.on('close', () => {
      this.call.close();
      this.destroy();
    });
    this.call.on('error', () => {
      console.error('Call Error');
    });
  }
}
export default PeerConnection;