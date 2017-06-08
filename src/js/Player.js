import Event from './Event';

class Player {
    constructor() {
        this._player = document.getElementsByTagName("video")[0];

        this._player.addEventListener('error', this.onError);
        this._player.addEventListener('pause', this.onPause);
        this._player.addEventListener('playing', this.onPlay);
        this._player.addEventListener('seeked', this.onSeeked);
        this._player.addEventListener('seeking', this.onSeeking);
        
        this._seekReport = undefined;
        this._playReport = undefined;
        this._pauseReport = undefined;
        this._seeking = false;
    }

    play = () => {
        this._playReport = true;
        return this._player.play();
    }

    pause = () => {
        this._pauseReport = true;
        this._player.pause();
    }

    seek = (position) => {
        return new Promise((resolve, reject) => {
            this._seekReport = resolve;
            this._player.currentTime = position;
        });
    }

    getPosition = () => {
        return this._player.currentTime;
    }

    onError = (err) => {
        console.error(err);
    }

    runOnReady = (func) => {
        const callback = () => {
            this._player.removeEventListener('canplay', callback);
            func();
        }
        this._player.addEventListener('canplay', callback);
    };

    onPause = () => {
        console.trace('PLAYER PAUSED', `PAUSE REPORT: ${this._pauseReport}`);
        

        if (this._pauseReport) {
            this._pauseReport = undefined;
        } else {
            Event.fire('playerEvent', {
                name: 'pause'
            });
        }
    }

    onPlay = () => {
        console.trace('PLAYER PLAYING');

        this._pauseReport = undefined;

        if (this._playReport) {
            this._playReport = undefined;
        } else {
            Event.fire('playerEvent', {
                name: 'play'
            });
        }
    }

    onSeeked = () => {
        console.trace('PLAYER SEEKED');

        this._seeking = false;

        if (this._seekReport) {
            this._seekReport();
            this._seekReport = undefined;
        } else {
            Event.fire('playerEvent', {
                name: 'seek',
                position: this.getPosition()
            });
        }
    }
}

export default Player;
