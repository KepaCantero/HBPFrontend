// Parameters needed for test_e2e/spec.js

/* eslint-disable */

var urlStartPage = 'http://' + browser.params.ipAddress + ':9000/#/';
var urlEsvPage = urlStartPage + 'esv-private';

module.exports = {

    SCREENSHOTS_PATH: 'test_e2e/screenshots/',

    // Buttons
    button: {
        START_PAGE: 'Get started!',
        LAUNCH: 'Launch',
        JOIN: 'Join'
    },

    // Timeouts
    timeout: {
        RESPOND: 1000, //a small delay for webpages to react
        SHORT: 5000,
        LONG: 300000,
    },
    spikePeriod: 0.025, //s
    // Experiments
    // Should be added for each new experiments present
    // Or automatically detected a list of available experiments
    EXPERIMENT: [
        'Husky Braitenberg experiment',
        'Husky Braitenberg experiment with automatically switching screens'
    ]
    ,
    // Url
    url: {
        Start: urlStartPage,
        Esv: urlEsvPage
    },

};
