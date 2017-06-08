class Http {

    constructor(url) {
        this.url = url;
    }

    // A small example of object


    // Method that performs the _ajax request
    _ajax(method, url,  args, sync) {

        // Creating a promise
        return new Promise((resolve, reject) => {

            // Instantiates the XMLHttpRequest
            const client = new XMLHttpRequest();
            let uri = this.url + url;

            if (args) {
                uri += '?';
                let argcount = 0;
                for (let key in args) {
                    if (args.hasOwnProperty(key)) {
                        if (argcount++) {
                            uri += '&';
                        }
                        uri += encodeURIComponent(key) + '=' + encodeURIComponent(args[key]);
                    }
                }
            }

            client.open(method, uri, !sync);

            if (!sync) {
                client.onload = function () {
                    const response = JSON.parse(this.response);
                    if (this.status >= 200 && this.status < 300 && (response.result === 1 || response.result === undefined)) {
                        // Performs the function "resolve" when this.status is equal to 2xx
                        resolve(this.response);
                    } else if (response.result === 0) {
                        reject(response.message);
                    } else {
                        // Performs the function "reject" when this.status is different than 2xx
                        reject(this.statusText);
                    }
                };
                client.onerror = function () {
                    reject(this.statusText);
                };
            }

            client.send();

            if (sync) {
                if (client.status === 200) {
                    console.log(client.responseText);
                } else {
                    console.error(client);
                }
            }
        });
    }

    get(url, args, sync = false) {
        return this._ajax('GET', url, args, sync);
    }

    post(url, args, sync = false) {
        return this._ajax('POST', url, args, sync);
    }

    put(url, args, sync = false) {
        return this._ajax('PUT', url, args, sync);
    }

    remove(url, args, sync = false) {
        return this._ajax('DELETE', url, args, sync);
    }
}

export default Http;