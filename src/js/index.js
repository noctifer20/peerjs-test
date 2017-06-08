import Together from './Together';
import $ from 'jquery';
import '../css/style.css';
import 'jquery-ui/themes/base/core.css';
import 'jquery-ui/themes/base/dialog.css';
import $dialog from 'jquery-ui/ui/widgets/dialog';
import './object-watch';

function get(sParam) {
  var sPageURL = window.location.search.substring(1);
  var sURLVariables = sPageURL.split('&');
  for (var i = 0; i < sURLVariables.length; i++) {
    var sParameterName = sURLVariables[i].split('=');
    if (sParameterName[0] == sParam) {
      return sParameterName[1];
    }
  }
}

function removeURLParameter(url, parameter) {
  //prefer to use l.search if you have a location/link object
  const urlparts = url.split('?');
  if (urlparts.length >= 2) {

    const prefix = encodeURIComponent(parameter) + '=';
    const pars = urlparts[1].split(/[&;]/g);

    //reverse iteration as may be destructive
    for (let i = pars.length; i-- > 0;) {
      //idiom for string.startsWith
      if (pars[i].lastIndexOf(prefix, 0) !== -1) {
        pars.splice(i, 1);
      }
    }

    url = urlparts[0] + (pars.length > 0 ? '?' + pars.join('&') : "");
    return url;
  } else {
    return url;
  }
}
class Extension {
  constructor() {
    this.session = {
      started: false
    };
    $(document).ready(this.init);
    this.session.watch('started', this.stateChange);
  }
  stateChange = () => {};
  init = () => {
    console.trace('CASTLY EXTENSION INIT');
    $('#connect-to-room').click(() => {
      this.TAPI = new Together('S6tfQJx796Y6BrzNk3Zb', $('#room-id').val());
      this.session.started = true;
    });

  };

  add = () => {
    console.trace('SHARE CLICK');

    this.roomId = this.roomId || Math.random().toString(36).substring(7);
    console.log(this.roomID);
    const _this = this;
    $dialog({
      resizable: false,
      title: "Пригласить Друзей",
      draggable: false,
      width: 'auto',
      closeText: "X",
      appendTo: document.webkitFullscreenElement || document.body,
      buttons: [
        {
          text: "Скопировать",
          click: function () {
            _this.copyToClipboard();
            $(this).dialog("close");
          }
        }
      ],
      open: () => $(document.body).addClass('blur'),
      close: () => $(document.body).removeClass('blur'),

    }, `<div><span id="copy-text">Скопируй линк и отправь друзьям чтобы смотреть вместе.</span><input type="text" id="copy-input" value="https://castly.tv/r/${this.roomId}"></div>`);

    if (this.TAPI)
      return;
    this.session.started = true;
    localStorage.setItem(removeURLParameter(window.location.href, 'TOGETHER_ROOM_ID') + 'TOGETHER_ROOM_ID', this.roomId);
    this.TAPI = new Together('S6tfQJx796Y6BrzNk3Zb', this.roomId);
  };
  copyToClipboard = () => {
    console.trace('COPY TO CLIPBOARD');
    var textarea = document.createElement("textarea");
    textarea.textContent = "https://castly.tv/r/" + this.roomId;
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand("copy");  // Security exception may be thrown by some browsers.
    } catch (ex) {
      console.warn("Copy to clipboard failed.", ex);
      return false;
    } finally {
      document.body.removeChild(textarea);
    }

    // $('body').append(
    //     $('<span />', {
    //         text: '✓ Link is copied to clipboard.',
    //         css: {
    //             position: 'fixed',
    //             left: '50%',
    //             top: '50%',
    //             transform: 'translate(-50%, -50%)',
    //             zIndex: 9999999,
    //             backgroundColor: '#e2dede',
    //             fontWeight: 'bold',
    //             color: '#464545',
    //             width: '300px',
    //             height: '35px',
    //             lineHeight: '32px',
    //             fontSize: "20px",
    //             textAlign: 'center',
    //             borderRadius: '20px'
    //         }
    //     }).fadeOut(4000, function () {
    //         $(this).remove();
    //     })
    // );
  }

  fullScreenChange = () => {
    if (document.webkitFullscreenElement) {
      $('#Castly_Together').appendTo(document.webkitFullscreenElement);
      var timer;
      var fadeInBuffer = false;
      $(document).mousemove(function () {
        if (!fadeInBuffer) {
          if (timer) {
            clearTimeout(timer);
            timer = 0;
          }

          $('.castly-btn-container').fadeIn();

        } else {
          fadeInBuffer = false;
        }


        timer = setTimeout(function () {
          if (document.webkitFullscreenElement)
            $('.castly-btn-container').fadeOut();

          fadeInBuffer = true;
        }, 3000)
      });
    } else {
      $('#Castly_Together').appendTo(document.body);
    }
  };

  destroy = () => {
    localStorage.removeItem(window.location.href + 'TOGETHER_ROOM_ID');
    window.location.href = removeURLParameter(window.location.href, 'TOGETHER_ROOM_ID');
    window.location.reload();
  }
}

window.castly = new Extension();
