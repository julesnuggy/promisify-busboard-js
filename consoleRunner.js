import { createInterface } from 'readline';
import { URL } from 'url';
import request from 'request';

const readline = createInterface({
    input: process.stdin,
    output: process.stdout
});

const POSTCODES_BASE_URL = 'https://api.postcodes.io';
const TFL_BASE_URL = 'https://api.tfl.gov.uk';

export default class ConsoleRunner {

    promptForPostcode() {
        return new Promise (resolve => {
            readline.question('\nEnter your postcode: ', function(postcode) {
                readline.close();
                resolve(postcode);
            })
        });
    }

    displayStopPoints(stopPoints) {
        stopPoints.forEach(point => {
            console.log(point.commonName);
        });
    }

    buildUrl(url, endpoint, parameters) {
        const requestUrl = new URL(endpoint, url);
        parameters.forEach(param => requestUrl.searchParams.append(param.name, param.value));
        return requestUrl.href;
    }

    makeGetRequest(baseUrl, endpoint, parameters) {
        const url = this.buildUrl(baseUrl, endpoint, parameters);

        return new Promise ((resolve, reject) => {request.get(url, (err, response, body) => {
            if (err) {
                reject(err);
            } else if (response.statusCode !== 200) {
                reject(response.statusCode);
            } else {
                resolve(body);
            }
        })});
    }

    getLocationForPostCode(postcode) {
        return new Promise((resolve, reject) => {
            this.makeGetRequest(POSTCODES_BASE_URL, `postcodes/${postcode}`, [])
                .then(responseBody => {
                    const jsonBody = JSON.parse(responseBody);
                    resolve({ latitude: jsonBody.result.latitude, longitude: jsonBody.result.longitude });
                })
                .catch(err => reject(`Failed to make GET request while getting location for postcode: ${err}`));
        });
    }

    getNearestStopPoints(latitude, longitude, count) {
        return new Promise((resolve, reject) => {
            this.makeGetRequest(
                TFL_BASE_URL,
                `StopPoint`,
                [
                    {name: 'stopTypes', value: 'NaptanPublicBusCoachTram'},
                    {name: 'lat', value: latitude},
                    {name: 'lon', value: longitude},
                    {name: 'radius', value: 1000},
                    {name: 'app_id', value: '' /* Enter your app id here */},
                    {name: 'app_key', value: '' /* Enter your app key here */}
                ])
                .then(responseBody => {
                    const stopPoints = JSON.parse(responseBody).stopPoints.map(function(entity) {
                        return { naptanId: entity.naptanId, commonName: entity.commonName };
                    }).slice(0, count);
                    resolve(stopPoints);
                })
                .catch(err => reject(`Failed to make GET request while getting nearest stop points: ${err}`));
        });
    }

    run() {
        const that = this;

        that.promptForPostcode()
            .then(postcode => {
              return postcode.replace(/\s/g, '');
            })
            .then(postcode => {
              return that.getLocationForPostCode(postcode)
            })
            .then(location => {
              return that.getNearestStopPoints(location.latitude, location.longitude, 5)
            })
            .then(stopPoints => {
              that.displayStopPoints(stopPoints)
            })
            .catch(err => {
                throw new Error(err);
            });
    }
}