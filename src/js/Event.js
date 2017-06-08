class EventClass {
    constructor() {
        this.queue = {};
    }

    fire(event, obj) {
        var queue = this.queue[event];

        if (typeof queue === 'undefined') {
            return;
        }

        queue.forEach((on)=>{
            on(obj);
        });
    }
    on(event, callback) {
            if (typeof this.queue[event] === 'undefined') {
                this.queue[event] = [];
            }
            this.queue[event].push(callback);
    }

    delete(event, callback){
        var index = this.queue[event].indexOf(callback);
        if (index > -1) {
            this.queue[event].splice(index, 1);
        }
    }
}

export default new EventClass();