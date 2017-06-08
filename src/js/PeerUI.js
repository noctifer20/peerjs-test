import Event from './Event';
import $dialog from 'jquery-ui/ui/widgets/dialog';
import $ from 'jquery';


class PeerUI {
  /*
   Task to be done
   1) UI - Sunday + Monday - Aug 21,22
   V Turn of my self audio
   V Add CSS properties for the circle video
   V Add Buttons Style
   V Add Buttons functionality
   V for Dragging and Droping
   V Bug in Corners
   V When you change the position is wrong on different edges
   V Hide Buttons if the user inActive on the given Peer
   V Obstacle Detection
   V On Scale change update position of the object
   V On Window size change
   V Bug: When object is out window and getIntersection is called the object will not appear any more.
   V Add Loader
   - Line 90 - dd to peer object call to turn off outgoing audio
   V Conference representation
   V Bug on Voice click
   */

  constructor(peer, options, peers) {
    console.log(peer);
    this.id = peer.id;
    this.peer = peer;
    this.scale = options.scale;
    this.self = options.self;
    this.checkStream();
    this.peer.stream && (this.streamURL = URL.createObjectURL(this.peer.stream));

    this.layer = document.getElementById('Castly_Together');
    document.addEventListener('webkitfullscreenchange', this.refresh);
    this.srcFiles = {
      miniVoice: "https://castly.tv/assets/Volume Up-50.png",
      miniVoiceOff: "https://castly.tv/assets/Volume Off.png",
      miniScaleBig: "https://castly.tv/assets/fullscreen.png",
      miniScaleSmall: "https://castly.tv/assets/widescreen.png",
    };

    this.state = {
      audio: true,
      scale: 128,
      position: {
        x: 0,
        y: 0,
      },
      buttons: false,
      alignedEdge: 0,
      menu: false,
      margin: 20,
    };
    this.peers = peers; //contains only positions and scales
    this.peers[this.id] = {
      pos: this.state.position,
      scale: this.state.scale + this.state.margin,
    };


    this.corners = {
      left_top: [],
      left_bottom: [],
      right_top: [],
      right_bottom: [],
    };

    this.func = {}

    this.buttons = [];

    this.render();
    window.onresize = () => {
      this.alignWithEdges();
    };

  }

  checkStream = () => {
    const stream = this.peer.stream;

    if (stream.getAudioTracks().length)
      this.peer.audio = true;

    if (stream.getVideoTracks().length)
      this.peer.video = true;
    if((!this.peer.audio || !this.peer.video) && this.self)
      PeerUI.showError("Ошибка", "Веб-камера/микрофон не доступны, но вы можете продолжить просмотр.");
  };

  refresh = () => {
    this.video.play()
  };

  render() {
    var videochat = document.createElement('div');
    videochat.id = this.id;
    PeerUI.setStyle(videochat, {
      'margin': this.state.margin / 2 + 'px',
      'width': '128px',
      'height': '128px',
      'position': 'absolute',
      'pointer-events': 'auto',
      'overflow': 'visible',
      '-webkit-user-select': 'none',
      '-moz-user-select': 'none',
      '-ms-user-select': 'none',
      'user-select': 'none',
      'z-index': '101',
      'top': '0',
      'left': '0',
    });

    this.videochat = videochat;
    videochat.onmousedown = this.onDragStart_Handler.bind(this);
    videochat.ondragstart = function () {
      return false;
    };

    videochat.onmouseenter = () => {
      this.displayButtons(true)
    };
    videochat.onmouseleave = () => {
      this.displayButtons(false)
    };
    this.initVideo(videochat);
    this.initButtons(videochat);
    this.layer.appendChild(videochat);
    this.alignWithEdges();
    this.func.goToMenu = this.goToMenu.bind(this);
    this.func.goBackFromMenu = this.goBackFromMenu.bind(this);
    Event.on('peer_go_to_menu', this.func.goToMenu);
    Event.on('peer_go_back_from_menu', this.func.goBackFromMenu);
  }

  goToMenu() {
    this.state.menu = true;
    var menu = document.getElementById('castly_menu_videochat');
    this.layer.removeChild(this.videochat);
    setTimeout(() => {
      menu.appendChild(this.videochat);
    }, 0);

    PeerUI.setStyle(this.videochat, {
      'position': 'relative',
      'pointer-events': 'none',
      'display': 'inline',
      'margin': this.state.margin,
      'top': '',
      'left': '',
    });
    this.setVideoScale(this.video, 300);
    this.video.play();

  }

  goBackFromMenu() {
    this.state.menu = false;
    var menu = document.getElementById('castly_menu_videochat');
    PeerUI.setStyle(this.videochat, {
      'position': 'absolute',
      'pointer-events': 'all',
      'margin': this.state.margin / 2,
    });
    menu.removeChild(this.videochat);
    setTimeout(() => {
      this.layer.appendChild(this.videochat);
    }, 0);
    this.alignWithEdges();
    this.setVideoScale(this.video, this.state.scale);
    this.video.play();
  }


  disableSelection(none) {
    PeerUI.setStyle(document.body, {
      '-webkit-touch-callout': none,
      '-webkit-user-select': none,
      '-khtml-user-select': none,
      '-moz-user-select': none,
      '-ms-user-select': none,
      'user-select': none,
    });
  }

  onDragStart_Handler(e) {
    var videochat = this.videochat;

    PeerUI.setStyle(videochat, {
      '-webkit-transition': '',
      '-moz-transition': '',
      '-o-transition': '',
      'transition': '',
      'z-index': '102',
    });

    this.disableSelection('none');

    var coords = this.getCoords(videochat);
    var shiftX = e.pageX - coords.left;
    var shiftY = e.pageY - coords.top;

    moveAt(e, this.state.margin);
    //videochat.style.zIndex = 1000;

    var initX = e.pageX;
    var initY = e.pageY;

    function moveAt(e, margin) {
      videochat.style.left = e.pageX - shiftX - margin / 2 + 'px';
      videochat.style.top = e.pageY - shiftY - margin / 2 + 'px';
    }

    document.onmousemove = (e) => {
      moveAt(e, this.state.margin);
    };

    var getIntersection = this.getIntersection.bind(this);
    videochat.onmouseup = (e) => {
      this.disableSelection('');
      document.onmousemove = null;
      videochat.onmouseup = null;
      PeerUI.setStyle(videochat, {
        '-webkit-transition': 'all 0.2s ease',
        '-moz-transition': 'all 0.2s ease',
        '-o-transition': 'all 0.2s ease',
        'transition': 'all 0.2s ease',
        'z-index': '9999',
      });
      var scale = this.state.scale + this.state.margin;
      var shift = {
        init: {x: initX - scale / 2, y: initY - scale / 2},
        dir: {x: e.pageX - initX, y: e.pageY - initY}
      }

      if (shift.dir.x * shift.dir.x + shift.dir.y * shift.dir.y > 100) {
        getIntersection(videochat, shift, scale);
      }


    };
  }

  getIntersection(videochat, s, scale) {

    var rect = this.layer.getBoundingClientRect();
    //Get Edge Vectors
    var top_edge = {
      init: {x: 0, y: 0},
      dir: {x: rect.right, y: 0}
    };

    var right_edge = {
      init: {x: rect.right, y: 0},
      dir: {x: 0, y: rect.bottom}
    };

    var bottom_edge = {
      init: {x: rect.right, y: rect.bottom},
      dir: {x: -rect.right, y: 0}
    };

    var left_edge = {
      init: {x: 0, y: rect.bottom},
      dir: {x: 0, y: -rect.bottom}
    };

    var pos = {
      x: s.dir.x + s.init.x,
      y: s.dir.y + s.init.y
    }
    var edge = this.state.alignedEdge;

    var edges = [top_edge, right_edge, bottom_edge, left_edge];
    // For each edge find the intersection and decide where to go
    edges.forEach((e, i) => {

      // Using inverse matrix calculations get intersection
      var x1 = s.dir.x;
      var y1 = -e.dir.x;
      var x2 = s.dir.y;
      var y2 = -e.dir.y;

      var b1 = e.init.x - s.init.x;
      var b2 = e.init.y - s.init.y;

      //Calculate Determinant
      var D = x1 * y2 - y1 * x2;
      var t1 = 0;
      var t2 = 0;

      if (D != 0) {
        t1 = (b1 * y2 - b2 * y1) / D
        t2 = (b2 * x1 - b1 * x2) / D
      }


      if (t1 > 0 && t2 >= 0 && t2 <= 1) {

        //Padding
        var padding = {x: 0, y: 0};
        if (i == 1) { //Right
          padding.x = scale;
        }
        else if (i == 2) { //Bottom
          padding.y = scale;
        }

        var pos_x = t1 * s.dir.x + s.init.x - padding.x;
        var pos_y = t1 * s.dir.y + s.init.y - padding.y;


        if (i == 0 || i == 2) { //Top or left
          pos_x = pos_x > rect.right - scale ? rect.right - scale : pos_x;
          pos_x = pos_x < 0 ? 0 : pos_x;
        }
        else if (i == 1 || i == 3) { //Right
          pos_y = pos_y > rect.bottom - scale ? rect.bottom - scale : pos_y;
          pos_y = pos_y < 0 ? 0 : pos_y;
        }

        var finalPosX = s.init.x + s.dir.x;
        var finalPosY = s.init.y + s.dir.y

        //Check if the position is near the edge
        if (finalPosY < scale) { // Top
          pos_x = finalPosX;
          pos_y = 0;
          i = 0;
        }
        else if (finalPosX > rect.right - 2 * scale) { // Right
          pos_x = rect.right - scale;
          pos_y = finalPosY;
          i = 1
        }
        else if (finalPosY > rect.bottom - 2 * scale) { //Bottom
          pos_x = finalPosX;
          pos_y = rect.bottom - scale;
          i = 2;
        }
        else if (finalPosX < scale) { //Left
          pos_x = 0;
          pos_y = finalPosY;
          i = 3;
        }

        //Check if it intersections are on the corners and improve
        if (finalPosX < scale && finalPosY < scale) { // Top Left
          pos_x = 0;
          pos_y = 0;

        }
        else if (finalPosX > rect.right - scale && finalPosY < scale) { // Top Right
          pos_x = rect.right - scale;
          pos_y = 0;
        }
        else if (finalPosX > rect.right - scale && finalPosY > rect.bottom - scale) { //Bottom-Right
          pos_x = rect.right - scale;
          pos_y = rect.bottom - scale;
        }
        else if (finalPosX < scale && finalPosY > rect.bottom - scale) { // Bottom-Left
          pos_x = 0;
          pos_y = rect.bottom - scale;
        }
        pos.x = pos_x;
        pos.y = pos_y;
        edge = i;
        //pos = this.checkValidness(pos_x, pos_y, rect, scale);
      }
    });

    this.state.alignedEdge = edge;
    pos = this.checkValidness(pos.x, pos.y, rect, scale);
    this.setPosition(pos.x, pos.y);
  }

  checkValidness(pos_x, pos_y, rect, scale) {

    var pos = this.checkOutOfScreen(pos_x, pos_y, rect, scale);
    var intersect = this.detectIntersection(pos.x, pos.y, scale);

    if (intersect.result == 1) {
      pos = this.decideNewPos(pos, scale, intersect.objs, this.state.alignedEdge, rect);
    }

    var pos = this.checkOutOfScreen(pos.x, pos.y, rect, scale);
    return pos;
  }

  checkOutOfScreen(pos_x, pos_y, rect, scale) {
    //Check if it final pos_x and pos_y are out of screen
    if (pos_x < 0) {
      pos_x = 0;
    }
    else if (pos_x > rect.right - scale) {
      pos_x = rect.right - scale;
    }

    if (pos_y < 0) {
      pos_y = 0;
    }
    else if (pos_y > rect.bottom - scale) {
      pos_y = rect.bottom - scale;
    }
    return {x: pos_x, y: pos_y};
  }

  detectIntersection(pos_x, pos_y, scale, radius, intersection) {
    pos_x += scale / 2;
    pos_y += scale / 2;
    var first = false;
    if (intersection) {
    }
    else {
      var intersection = {
        result: 0,
        objs: []
      };
      first = true;
    }

    for (var id in this.peers) {
      var peer = this.peers[id];

      var pass = id != this.id;

      for (var i = intersection.objs.length - 1; i >= 0; i--) {
        if (intersection.objs[i].i == id) {
          pass = false;
        }
      }
      if (first) {
        radius = peer.scale / 2 + scale / 2;
      }

      if (pass) {
        var x = peer.pos.x + peer.scale / 2;
        var y = peer.pos.y + peer.scale / 2;

        if (Math.sqrt(Math.pow(x - pos_x, 2) + Math.pow(y - pos_y, 2)) < radius) {
          intersection.result = 1;
          intersection.objs.push({
            x: x - peer.scale / 2,
            y: y - peer.scale / 2,
            s: peer.scale,
            i: id,
          });

          //Recursively find other objs
          this.detectIntersection(x - peer.scale / 2, y - peer.scale / 2, peer.scale, scale + peer.scale, intersection);
        }
      }
    }
    return intersection;
  }

  decideNewPos(pos, scale, objs, edge, rect) {
    //1) get minimum object with x or y
    //2) get overall width
    var newPos = {x: 0, y: 0};
    var minPos = {x: objs[0].x, x_s: objs[0].s, y: objs[0].y, y_s: objs[0].s};
    var maxPos = {x: objs[0].x, x_s: objs[0].s, y: objs[0].y, y_s: objs[0].s};
    var width = 0;

    objs.forEach((obj, i) => {
      if (obj.x < minPos.x) {
        minPos.x = obj.x;
        minPos.x_s = obj.s;
      }
      if (obj.y < minPos.y) {
        minPos.y = obj.y;
        minPos.y_s = obj.s;
      }

      if (obj.x > maxPos.x) {
        maxPos.x = obj.x;
        maxPos.x_s = obj.s;
      }
      if (obj.y > maxPos.y) {
        maxPos.y = obj.y;
        maxPos.y_s = obj.s;
      }
      width += obj.s;
    });

    //3) compare where to go
    var dir = '';
    if (edge == 0 || edge == 2) { //Top or Bottom
      dir = pos.x > (minPos.x + width / 2) ? 'right' : 'left';
    }
    else { //Left or right
      dir = pos.y > (minPos.y + width / 2) ? 'bottom' : 'up';
    }

    newPos = this.goDir(dir, pos, scale, minPos, maxPos, width);

    var newerPos = this.checkOutOfScreen(newPos.x, newPos.y, rect, scale);
    if (newerPos.x != newPos.x || newerPos.y != newPos.y) {
      dir = this.inverseDir(dir);
      newPos = this.goDir(dir, pos, scale, minPos, maxPos, width);
    }

    //4) Validate the place
    return newPos
  }

  inverseDir(dir) {
    switch (dir) {
      case 'left':
        return 'right';
        break;
      case 'right':
        return 'left';
        break;
      case 'up':
        return 'bottom';
        break;
      case 'bottom':
        return 'up';
        break;
    }
  }

  goDir(dir, pos, scale, minPos, maxPos, width) {

    var newPos = {x: 0, y: 0};
    switch (dir) {
      case 'left':
        newPos.x = minPos.x - scale;
        newPos.y = pos.y;
        break;
      case 'right':
        newPos.x = maxPos.x + maxPos.x_s;
        newPos.y = pos.y;
        break;
      case 'up':
        newPos.x = pos.x;
        newPos.y = minPos.y - scale;
        break;
      case 'bottom':
        newPos.x = pos.x;
        newPos.y = minPos.y + maxPos.y_s;
        break;
    }
    return newPos;
  }

  setPosition(pos_x, pos_y) {
    var style = {
      top: '', left: '', right: '', bottom: '',
    }

    style.top = pos_y + 'px';
    style.left = pos_x + 'px';
    this.state.position = {
      x: pos_x,
      y: pos_y,
    }

    this.peers[this.id].pos = this.state.position;
    PeerUI.setStyle(this.videochat, style);
  }

  getCoords(elem) {
    // (1)
    var box = elem.getBoundingClientRect();

    var body = document.body;
    var docEl = document.documentElement;

    // (2)
    var scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
    var scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

    // (3)
    var clientTop = docEl.clientTop || body.clientTop || 0;
    var clientLeft = docEl.clientLeft || body.clientLeft || 0;

    // (4)
    var top = box.top + scrollTop - clientTop;
    var left = box.left + scrollLeft - clientLeft;

    return {
      top: top,
      left: left
    };
  }


  initVideo(videochat) {
    if (!this.peer.video) {
      const img = document.createElement('img');
      img.src = 'https://castly.tv/assets/user.png';
      videochat.appendChild(img);
      if (this.peer.audio) {
        this.video = document.createElement('audio');
        this.video.src = this.streamURL;
        this.video.autoplay = true;
        this.video.muted = this.self;

        this.video.addEventListener('loadeddata', () => {
          videochat.appendChild(this.video);

        }, false);
      }
    } else {
      const spinner = document.createElement('div');
      spinner.className = 'loader';
      videochat.appendChild(spinner);

      this.video = document.createElement('video');
      this.video.src = this.streamURL;
      this.video.autoplay = true;
      this.video.muted = this.self;
      this.setVideoRoundnes(this.video);
      this.setVideoScale(this.video, this.scale);

      this.video.addEventListener('loadeddata', () => {
        videochat.removeChild(spinner);
        videochat.appendChild(this.video);

        PeerUI.setStyle(videochat, {
          'width': '',
          'height': '',
        });
      }, false);
    }


  }

  initButtons(videochat) {

    var miniVoice = {
      'right': '0px',
      'bottom': '0px',
    }

    var miniScale = {
      'right': '0px',
      'top': '0px',
    }

    var onVoice = this.onClickVoice.bind(this);
    var onScale = this.onClickScale.bind(this);

    this.buttons['audio'] = this.initButton(videochat, this.srcFiles.miniVoice, miniVoice, onVoice);
    this.buttons['scale'] = this.initButton(videochat, this.srcFiles.miniScaleSmall, miniScale, onScale);

  };

  displayButtons(show) {
    var display = show ? 'inline-block' : 'none';
    PeerUI.setStyle(this.buttons.audio, {'display': display});
    PeerUI.setStyle(this.buttons.scale, {'display': display});
  }


  onClickVoice() {
    this.state.audio = !this.state.audio;
    this.state.voiceButton = this.state.audio ? this.srcFiles.miniVoice : this.srcFiles.miniVoiceOff;
    this.buttons.audio.src = this.state.voiceButton;

    if (this.self) {
      this.peer.stream.getAudioTracks()[0].enabled = !this.peer.stream.getAudioTracks()[0].enabled;
    }
    else {
      this.video.muted = this.state.audio ? '' : 'muted';
    }

    var alignWithEdges = this.alignWithEdges.bind(this);
    alignWithEdges();
    //console.log(this.peers);
  }

  onClickScale() {

    if (this.state.scale == 128) {
      this.state.scale = 64;
      this.buttons.scale.src = this.srcFiles.miniScaleBig;
      this.setVideoScale(this.video, this.state.scale);
    }
    else {
      this.state.scale = 128;
      this.buttons.scale.src = this.srcFiles.miniScaleSmall;
      this.setVideoScale(this.video, this.state.scale);
    }

    this.peers[this.id].scale = this.state.scale + this.state.margin;
    var alignWithEdges = this.alignWithEdges.bind(this);
    alignWithEdges();

  }

  alignWithEdges() {
    if (this.state.menu) return;
    //Top
    var dir = {x: 0, y: 0};
    //[top_edge, right_edge, bottom_edge, left_edge];

    switch (this.state.alignedEdge) {
      case 0: //top_edge
        dir = {x: 0, y: -1};
        break;
      case 1: // right_edge
        dir = {x: 1, y: 0};
        break;
      case 2: // bottom_edge
        dir = {x: 0, y: 1};
        break;
      case 3: // left_edge
        dir = {x: -1, y: 0};
        break;
    }

    //Add here shift
    var shift = {
      init: this.state.position,
      dir: dir,
    };

    this.getIntersection(this.videochat, shift, this.state.scale + this.state.margin);
  }

  initButton(videochat, src, stylePos, onClick) {
    var miniButtonStyle = {
      'display': 'none',
      'width': '16px',
      'padding': '3px',
      'pointer-events': 'all',
      'position': 'absolute',
      'background-color': 'rgba(50,50,50,0.5)',
      '-webkit-border-radius': '50%',
      '-moz-border-radius': '50%',
      'border-radius': '50%',
      'z-index': '5000',
    };

    var buttonControl = document.createElement('img');
    buttonControl.src = src;
    buttonControl.addEventListener("click", onClick);
    PeerUI.setStyle(buttonControl, miniButtonStyle);
    PeerUI.setStyle(buttonControl, stylePos);
    videochat.appendChild(buttonControl);
    return buttonControl;

  }


  setVideoScale(video, scale) {
    video.width = scale;
    video.height = scale;
  }


  setVideoRoundnes(video) {
    PeerUI.setStyle(video, {
      'object-fit': 'cover',
      '-webkit-border-radius': '50%',
      '-moz-border-radius': '50%',
      '-border-radius': '50%',
      'pointer-events': 'none',
      '-webkit-transition': 'all 0.2s ease',
      '-moz-transition': 'all 0.2s ease',
      '-o-transition': 'all 0.2s ease',
      'transition': 'all 0.2s ease',
    });
  }

  destroy() {
    var re = this.layer;
    if (this.state.menu) {
      re = document.getElementById('castly_menu_videochat');
    }

    Event.delete('peer_go_to_menu', this.func.goToMenu);
    Event.delete('peer_go_back_from_menu', this.func.goBackFromMenu);
    re.removeChild(this.videochat);
  }

  static setStyle(el, style) {
    for (var prop in style) {
      el.style[prop] = style[prop];
    }
  }

  static initError() {
    // Create error dialog
    var errorDialog = document.createElement('div');
    var heading = document.createElement('div');
    var msg = document.createElement('div');

    errorDialog.id = 'castly_error';
    heading.id = 'castly_error_header'
    msg.id = 'castly_error_msg'

    PeerUI.setStyle(errorDialog, {
      'display': 'none',
      'z-index': '10',
      'position': 'absolute',
      'color': 'white',
      'right': '0',
      'opacity': '0.9',
      'width': '344px',
      'border': '1px solid',
      'border-radius': '5px',
      'padding': '0px 0px 10px 10px',
      'margin-top': '10px',
      'margin-right': '10px',
      'font-size': '13px',
      'font-family': 'Lato, Arial, Times, serif',
      'font-weight': 'normal',
    });

    PeerUI.setStyle(heading, {
      'display': 'block',
      'margin-top': '1em',
      'margin-bottom': '1em',
      'margin-left': '0',
      'margin-right': '0',
      'font-weight': 'bold',
    });

    PeerUI.constructRefreshButton(errorDialog);

    errorDialog.appendChild(heading);
    errorDialog.appendChild(msg);

    return errorDialog;
  }

  static constructRefreshButton(errorWindow) {
    var style = {
      'display': 'block',
      'width': '24px',
      'padding': '10px',
      'position': 'absolute',
      'z-index': '5000',
      'right': '0px',
      'top': '0px',
      'cursor': 'pointer',
      'pointer-events': 'fill',
    };

    var buttonControl = document.createElement('img');
    buttonControl.src = "assets/refresh.png";

    buttonControl.addEventListener("click", PeerUI.onRefresh);
    PeerUI.setStyle(buttonControl, style);
    errorWindow.appendChild(buttonControl);
  }

  static onRefresh() {
    //console.log('refresh');
    location.reload();
  }

  static showError(header, msg) {
    // var error = document.getElementById('castly_error');
    // PeerUI.setStyle(error, {
    // 	'display': 'block',
    // });
    //
    // document.getElementById('castly_error_header').innerHTML = header;
    // document.getElementById('castly_error_msg').innerHTML = msg;
    $dialog({
      resizable: false,
      title: header,
      draggable: false,
      width: 'auto',
      closeText: "X",
      className: "castly-error",
      appendTo: document.body,
      buttons: [
        {
          text: "Ок",
          click: function () {
            $(this).dialog("close");
          }
        }
      ],
      open: () => $(document.body).addClass('blur'),
      close: () => $(document.body).removeClass('blur'),

    }, `<div><span id="error-message">${msg}</span></div>`);
  }

  static hideError() {
    var error = document.getElementById('castly_error');
    PeerUI.setStyle(error, {
      'display': 'none',
    });
  }

  static initMenu() {
    /* Create DOM */

    var menu = document.createElement('div');
    menu.id = 'castly_menu';

    var header = document.createElement('div');
    header.id = 'castly_header';
    menu.appendChild(header);

    //Logo
    var logo = document.createElement('a');
    var C = document.createElement('span');
    C.innerHTML = 'C';
    var astly = document.createTextNode("astly");
    var dot = document.createElement('span');
    var tv = document.createTextNode("tv");
    dot.innerHTML = '.'

    logo.appendChild(C);
    logo.appendChild(astly);
    logo.appendChild(dot);
    logo.appendChild(tv);

    header.appendChild(logo);

    //Videochat Place
    var videochat = document.createElement('div');
    videochat.id = 'castly_menu_videochat';

    menu.appendChild(videochat);

    //Button
    var buttons = document.createElement('div');
    buttons.id = 'buttons-list';
    var button = document.createElement('a');
    var buttonIMG = document.createElement('img');
    buttonIMG.src = 'https://castly.tv/img/platform/stop-watching.png'
    button.appendChild(buttonIMG);
    buttons.appendChild(button);

    menu.appendChild(buttons);

    /* CSS */
    PeerUI.setStyle(menu, {
      'display': 'none',
      'top': '0px',
      'position': 'fixed',
      'width': '100%',
      'height': '100%',
      'background-color': 'rgba(67,67,67,0.6)',
    });

    PeerUI.setStyle(header, {
      'margin-top': '40px',
      'text-align': 'center',
    });

    PeerUI.setStyle(logo, {
      'font-size': '48px',
      'margin-left': '0',
      'color': 'white',
      'font-family': 'Lato, Arial',
      'font-weight': '300',
    });

    PeerUI.setStyle(C, {
      'color': '#4adc2f',
    });

    PeerUI.setStyle(dot, {
      'color': '#4adc2f',
    });

    PeerUI.setStyle(buttons, {
      'text-align': 'center',
      'bottom': '0px',
      'position': 'absolute',
      'width': '100%',
    });

    PeerUI.setStyle(button, {
      'vertical-align': 'middle',
      'margin-bottom': '40px',
      'display': 'inline-block',
      'margin-left': '40px',
      'margin-right': '40px',
      'text-align': 'center',
      'font-size': '140%',
      'color': 'rgba(255,255,255,0.9)',
      'font-weight': '300',
      '-webkit-transition': 'all .2s ease-in-out',
      '-moz-transition': 'all .2s ease-in-out',
      '-o-transition': 'all .2s ease-in-out',
      'transition': 'all .2s ease-in-out',
      'z-index': '5000',
    });

    PeerUI.setStyle(buttonIMG, {
      'width': '30px',
      'margin-right': '15px',
      'margin-top': '-3px',
      'pointer-events': 'visible',
    });

    PeerUI.setStyle(videochat, {
      'text-align': 'center',
      'padding-top': '100px',

    });

    button.addEventListener("click", PeerUI.hideMenu);

    return menu;

  }

  static showMenu() {
    var menu = document.getElementById('castly_menu');
    PeerUI.setStyle(menu, {
      'display': 'block',
    });

    Event.fire('peer_go_to_menu', {});

  }

  static hideMenu() {
    var menu = document.getElementById('castly_menu');
    PeerUI.setStyle(menu, {
      'display': 'none',
    });

    Event.fire('peer_go_back_from_menu', {});
    Event.fire('menu_close', {});
  }

  static init() {
    var layer = document.createElement('div');
    document.body.style.margin = '0px';
    layer.id = 'Castly_Together';

    //CSS
    PeerUI.setStyle(layer, {
      'display': 'block',
      'margin': '0px',
      'position': 'absolute',
      'top': '0px',
      'left': '0px',
      'height': '100%',
      'width': '100%',
      'padding': '0px',
      'pointer-events': 'none',
      'z-index': '9999',
      'overflow': 'hidden',
    });

    var error = PeerUI.initError();
    var menu = PeerUI.initMenu();

    layer.appendChild(error);
    layer.appendChild(menu);

    var style = document.createElement('style');
    style.innerHTML = ".loader { color: #ffffff; font-size: 6px; margin: 64px auto; width: 5px; height: 5px; border-radius: 50%; position: relative; text-indent: -9999em; -webkit-animation: load4 1s infinite linear; animation: load4 1s infinite linear; -webkit-transform: translateZ(0); -ms-transform: translateZ(0); transform: translateZ(0);} @-webkit-keyframes load4 {  0%,  100% {    box-shadow: 0 -3em 0 0.2em, 2em -2em 0 0em, 3em 0 0 -1em, 2em 2em 0 -1em, 0 3em 0 -1em, -2em 2em 0 -1em, -3em 0 0 -1em, -2em -2em 0 0;  }  12.5% {    box-shadow: 0 -3em 0 0, 2em -2em 0 0.2em, 3em 0 0 0, 2em 2em 0 -1em, 0 3em 0 -1em, -2em 2em 0 -1em, -3em 0 0 -1em, -2em -2em 0 -1em;  }  25% {    box-shadow: 0 -3em 0 -0.5em, 2em -2em 0 0, 3em 0 0 0.2em, 2em 2em 0 0, 0 3em 0 -1em, -2em 2em 0 -1em, -3em 0 0 -1em, -2em -2em 0 -1em;  }  37.5% {    box-shadow: 0 -3em 0 -1em, 2em -2em 0 -1em, 3em 0em 0 0, 2em 2em 0 0.2em, 0 3em 0 0em, -2em 2em 0 -1em, -3em 0em 0 -1em, -2em -2em 0 -1em;  }  50% {    box-shadow: 0 -3em 0 -1em, 2em -2em 0 -1em, 3em 0 0 -1em, 2em 2em 0 0em, 0 3em 0 0.2em, -2em 2em 0 0, -3em 0em 0 -1em, -2em -2em 0 -1em;  }  62.5% {    box-shadow: 0 -3em 0 -1em, 2em -2em 0 -1em, 3em 0 0 -1em, 2em 2em 0 -1em, 0 3em 0 0, -2em 2em 0 0.2em, -3em 0 0 0, -2em -2em 0 -1em;  }  75% {    box-shadow: 0em -3em 0 -1em, 2em -2em 0 -1em, 3em 0em 0 -1em, 2em 2em 0 -1em, 0 3em 0 -1em, -2em 2em 0 0, -3em 0em 0 0.2em, -2em -2em 0 0;  }  87.5% {    box-shadow: 0em -3em 0 0, 2em -2em 0 -1em, 3em 0 0 -1em, 2em 2em 0 -1em, 0 3em 0 -1em, -2em 2em 0 0, -3em 0em 0 0, -2em -2em 0 0.2em;  }} @keyframes load4 {  0%,  100% {    box-shadow: 0 -3em 0 0.2em, 2em -2em 0 0em, 3em 0 0 -1em, 2em 2em 0 -1em, 0 3em 0 -1em, -2em 2em 0 -1em, -3em 0 0 -1em, -2em -2em 0 0;  }  12.5% {    box-shadow: 0 -3em 0 0, 2em -2em 0 0.2em, 3em 0 0 0, 2em 2em 0 -1em, 0 3em 0 -1em, -2em 2em 0 -1em, -3em 0 0 -1em, -2em -2em 0 -1em;  }  25% {    box-shadow: 0 -3em 0 -0.5em, 2em -2em 0 0, 3em 0 0 0.2em, 2em 2em 0 0, 0 3em 0 -1em, -2em 2em 0 -1em, -3em 0 0 -1em, -2em -2em 0 -1em;  }  37.5% {    box-shadow: 0 -3em 0 -1em, 2em -2em 0 -1em, 3em 0em 0 0, 2em 2em 0 0.2em, 0 3em 0 0em, -2em 2em 0 -1em, -3em 0em 0 -1em, -2em -2em 0 -1em;  }  50% {    box-shadow: 0 -3em 0 -1em, 2em -2em 0 -1em, 3em 0 0 -1em, 2em 2em 0 0em, 0 3em 0 0.2em, -2em 2em 0 0, -3em 0em 0 -1em, -2em -2em 0 -1em;  }  62.5% {    box-shadow: 0 -3em 0 -1em, 2em -2em 0 -1em, 3em 0 0 -1em, 2em 2em 0 -1em, 0 3em 0 0, -2em 2em 0 0.2em, -3em 0 0 0, -2em -2em 0 -1em;  }  75% {    box-shadow: 0em -3em 0 -1em, 2em -2em 0 -1em, 3em 0em 0 -1em, 2em 2em 0 -1em, 0 3em 0 -1em, -2em 2em 0 0, -3em 0em 0 0.2em, -2em -2em 0 0;  }  87.5% {    box-shadow: 0em -3em 0 0, 2em -2em 0 -1em, 3em 0 0 -1em, 2em 2em 0 -1em, 0 3em 0 -1em, -2em 2em 0 0, -3em 0em 0 0, -2em -2em 0 0.2em;  }}"
    document.body.appendChild(style);


    document.body.appendChild(layer);
  }
}
export default PeerUI;