/* eslint-env node */
'use strict';

// todo: 
// https://rawgit.com/otalk/sdp/master/sdp.js

const fs = require('fs')

fs.readFile('/Users/johnny/Downloads/sdp.json', 'utf8', (err, data) => {
    if (err) {
        return console.log(err)
    }
    let sdpObject = JSON.parse(data)
    console.log(sdpObject.offer.origin.sdp)
    console.log(sdpObject.offer.modified.sdp)
    console.log(sdpObject.answer.origin.sdp)
    console.log(sdpObject.answer.modified.sdp)
    // return sdpObject
})