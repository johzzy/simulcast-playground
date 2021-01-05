/* eslint-env node */
'use strict';

const SDPTool = {};

// let codecs_white_list = ["VP8", "VP9", "H264", "red", "ulpfec"].map(name => name.toUpperCase())
let codecs_white_list = ['VP8']
// let codecs_white_list = ['VP9']
// let codecs_white_list = ['H264']

const rids = [0, 1, 2]
const rids_mapping = {
    low: 0,
    mid: 1,
    hi: 2,
}

SDPTool.sendEncodings = rids.map(rid => ({ rid }))


SDPTool.ModifyOffer = function(offer_sdp) {
    const sections = SDPUtils.splitSections(offer_sdp);
    const dtls = SDPUtils.getDtlsParameters(sections[1], sections[0]);
    const ice = SDPUtils.getIceParameters(sections[1], sections[0]);
    const rtpParameters = SDPUtils.parseRtpParameters(sections[1]);
    const rtcpParameters = SDPUtils.parseRtcpParameters(sections[1]);

    // The gist of this hack is that rid and mid have the same wire format.
    // Kudos to orphis for this clever hack!
    const rid = rtpParameters.headerExtensions.find(ext => ext.uri === 'urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id');
    rtpParameters.headerExtensions = rtpParameters.headerExtensions.filter(ext => {
        return !extensionsToFilter.includes(ext.uri);
    });
    // This tells the other side that the RID packets are actually mids.
    rtpParameters.headerExtensions.push({ id: rid.id, uri: 'urn:ietf:params:rtp-hdrext:sdes:mid', direction: 'sendrecv' });

    // Filter rtx as we have no wait to reinterpret rrid. Not doing this makes probing use RTX, its not understood
    // and ramp-up is slower.
    rtpParameters.codecs = rtpParameters.codecs.filter(c => c.name.toUpperCase() !== 'RTX');
    {
        let origin_codecs = rtpParameters.codecs.map(codec => codec.name).filter(function onlyUnique(value, index, self) {
                        return self.indexOf(value) === index
                    })
        // console.log(origin_codecs)
        rtpParameters.codecs = rtpParameters.codecs.filter(codec => codecs_white_list.includes(codec.name.toUpperCase()))
    }

    let sdp = SDPUtils.writeSessionBoilerplate() +
        SDPUtils.writeDtlsParameters(dtls, 'actpass') +
        SDPUtils.writeIceParameters(ice) +
        'a=group:BUNDLE 0 1 2\r\n' +
        'a=msid-semantic:WMS *\r\n';
    const codecs = SDPUtils.writeRtpDescription('video', rtpParameters) +
        SDPUtils.writeRtcpParameters({
            mux: rtcpParameters.mux,
            reducedSize: rtcpParameters.reducedSize,
        });
    // console.log('codecs:', codecs);
    for (let msid in rids_mapping) {
        sdp += codecs +
            'a=setup:actpass\r\n' +
            'a=mid:' + rids_mapping[msid] + '\r\n' +
            'a=msid:' + msid + ' ' + msid + '\r\n'
    }
    return sdp
} 

SDPTool.ModifyAnswer = function(answer_sdp) {
    const sections = SDPUtils.splitSections(answer_sdp);
    const dtls = SDPUtils.getDtlsParameters(sections[1], sections[0]);
    const ice = SDPUtils.getIceParameters(sections[1], sections[0]);
    const rtpParameters = SDPUtils.parseRtpParameters(sections[1]);
    const rtcpParameters = SDPUtils.parseRtcpParameters(sections[1]);
    // Avoid duplicating the mid extension even though Chrome does not care (boo!)
    rtpParameters.headerExtensions = rtpParameters.headerExtensions.filter(ext => {
        return !extensionsToFilter.includes(ext.uri);
    });
    let sdp = SDPUtils.writeSessionBoilerplate() +
        SDPUtils.writeDtlsParameters(dtls, 'active') +
        SDPUtils.writeIceParameters(ice) +
        'a=group:BUNDLE 0\r\n' +
        'a=msid-semantic:WMS *\r\n';

    {
        let origin_codecs = rtpParameters.codecs.map(codec => codec.name).filter(function onlyUnique(value, index, self) {
                        return self.indexOf(value) === index
                    })
        // console.log(origin_codecs)
        rtpParameters.codecs = rtpParameters.codecs.filter(codec => codecs_white_list.includes(codec.name.toUpperCase()))
    }
    const codecs = SDPUtils.writeRtpDescription('video', rtpParameters) +
        SDPUtils.writeRtcpParameters({
            mux: rtcpParameters.mux,
            reducedSize: rtcpParameters.reducedSize,
        });

    

    sdp += codecs;
    sdp += 'a=setup:active\r\n';

    let rids = [0, 1, 2]
    rids.forEach(rid => {
        sdp += 'a=rid:' + rid + ' recv\r\n';
    });
    sdp += 'a=simulcast:recv ' + rids.join(';') + '\r\n';
    sdp += 'a=mid:' + SDPUtils.getMid(SDPUtils.splitSections(pc1.localDescription.sdp)[1]) + '\r\n';

    // Re-add headerextensions we filtered.
    const headerExtensions = SDPUtils.parseRtpParameters(SDPUtils.splitSections(pc1.localDescription.sdp)[1]).headerExtensions;
    headerExtensions.forEach(ext => {
        if (extensionsToFilter.includes(ext.uri)) {
            sdp += 'a=extmap:' + ext.id + ' ' + ext.uri + '\r\n';
        }
    });
    return sdp;
} 