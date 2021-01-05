/* eslint-env node */
'use strict';

// todo: 
// https://rawgit.com/otalk/sdp/master/sdp.js

const fs = require('fs')

fs.readFile('/Users/johnny/Downloads/sdp.json', 'utf8', (err, data) => {
    if (err) {
        return console.log(err)
    }
    let obj = JSON.parse(data)
    // console.log(obj.offer.origin.sdp)
    // console.log(obj.offer.modified.sdp)
    // console.log(obj.answer.origin.sdp)
    // console.log(obj.answer.modified.sdp)

    console.log(obj.offer.origin.text)
    console.log(obj.offer.modified.text)
    console.log(obj.answer.origin.text)
    console.log(obj.answer.modified.text)
})