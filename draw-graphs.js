// helper for graphs.
const bitrateSeries = {};
const bitrateGraphs = {};
const framerateSeries = {};
const framerateGraphs = {};
let lastSendResult;
let lastRecvResult;

// Only for Firefox.
let ssrc2track;

const idSeries = new Map()
const colorSeries = new Map()

// Show a stream and draw graphs.
function show(stream, isRemote) {
    const id = isRemote ? stream.id : 'local';

    const container = document.createElement('div');
    container.id = id + 'Container';
    document.getElementById(isRemote ? 'remotes' : 'local').appendChild(container);

    const v = document.createElement('video');
    v.autoplay = true;
    v.srcObject = stream;
    v.onresize = () => {
        const labelId = container.id + 'Label';
        v.title = 'video dimensions: ' + v.videoWidth + 'x' + v.videoHeight;
        v.innerHTML = v.title
        const label = document.getElementById(labelId) || document.createElement('p');
        if (label.id.length == 0) {
            label.id = labelId;
            container.appendChild(label);
        } 
        label.innerHTML = v.title

        if (isRemote) {
            idSeries[v.videoWidth + 'x' + v.videoHeight] = id
            const color = colorSeries[v.videoWidth + 'x' + v.videoHeight]
            bitrateSeries[id].setColor(color);
            framerateSeries[id].setColor(color);
        }
    }
    container.appendChild(v);

    const bitrateCanvas = document.createElement('canvas');
    bitrateCanvas.id = id + 'BitrateCanvas';
    bitrateCanvas.title = 'Bitrate';
    container.appendChild(bitrateCanvas);

    const bitrateGraph = new TimelineGraphView(id + 'Container', id + 'BitrateCanvas');
    bitrateGraph.updateEndDate();

    bitrateSeries[id] = id === 'local' ? new Map() : new TimelineDataSeries();
    bitrateGraphs[id] = bitrateGraph;

    const framerateCanvas = document.createElement('canvas');
    framerateCanvas.id = id + 'FramerateCanvas';
    framerateCanvas.title = 'Framerate';
    container.appendChild(framerateCanvas);

    const framerateGraph = new TimelineGraphView(id + 'Container', id + 'FramerateCanvas');
    framerateGraph.updateEndDate();

    framerateSeries[id] = id === 'local' ? new Map() : new TimelineDataSeries();
    framerateGraphs[id] = framerateGraph;
}

async function draw(pc1, pc2) {
    const graphName = 'local';
    const res1 = await pc1.getSenders()[0].getStats();
    res1.forEach((report) => {
        if (report.type !== 'outbound-rtp') return;
        const now = report.timestamp;
        const bytes = report.bytesSent;
        const frames = report.framesEncoded;
        if (lastSendResult && lastSendResult.get(report.id)) {
            const ssrc = report.ssrc;

            // calculate bitrate
            const bitrate = 8000 * (bytes - lastSendResult.get(report.id).bytesSent) /
                (now - lastSendResult.get(report.id).timestamp);
            if (!bitrateSeries[graphName].has(ssrc)) {
                const series = new TimelineDataSeries();
                bitrateSeries[graphName].set(ssrc, series);
                if (bitrateSeries[graphName].size === 2) {
                    series.setColor('green');
                } else if (bitrateSeries[graphName].size === 3) {
                    series.setColor('blue');
                }
            
                bitrateSeries[graphName].get(ssrc).addPoint(now, bitrate);

                //  calculate framerate.
                const framerate = 1000 * (frames - lastSendResult.get(report.id).framesEncoded) /
                    (now - lastSendResult.get(report.id).timestamp);
                if (!framerateSeries[graphName].has(ssrc)) {
                    const series = new TimelineDataSeries();
                    framerateSeries[graphName].set(ssrc, series);
                    if (framerateSeries[graphName].size === 2) {
                        series.setColor('green');
                    } else if (framerateSeries[graphName].size === 3) {
                        series.setColor('blue');
                    }
                    colorSeries[report.frameWidth + 'x' + report.frameHeight] = series.color_
                    const id = idSeries[report.frameWidth + 'x' + report.frameHeight]
                    if (bitrateSeries.hasOwnProperty(id)) {
                        bitrateSeries[id].setColor(series.color_);
                        framerateSeries[id].setColor(series.color_);
                    } else {
                        console.warn('not found:', id, series.color_)
                    }
                }
                framerateSeries[graphName].get(ssrc).addPoint(now, framerate);
            }

            if (bitrate >= 0) {
                bitrateSeries[graphName].get(ssrc).addPoint(now, bitrate);
            }

            //  calculate framerate.
            const framerate = 1000 * (frames - lastSendResult.get(report.id).framesEncoded) /
                (now - lastSendResult.get(report.id).timestamp);
            if (!framerateSeries[graphName].has(ssrc)) {
                const series = new TimelineDataSeries();
                framerateSeries[graphName].set(ssrc, series);
                if (framerateSeries[graphName].size === 2) {
                    series.setColor('green');
                } else if (framerateSeries[graphName].size === 3) {
                    series.setColor('blue');
                }
            }
            if (framerate >= 0) {
                framerateSeries[graphName].get(ssrc).addPoint(now, framerate);
            }
        }
    });
    bitrateGraphs[graphName].setDataSeries(Array.from(bitrateSeries[graphName].values()));
    bitrateGraphs[graphName].updateEndDate();

    framerateGraphs[graphName].setDataSeries(Array.from(framerateSeries[graphName].values()));
    framerateGraphs[graphName].updateEndDate();
    lastSendResult = res1;

    const res2 = await pc2.getStats();
    res2.forEach((report) => {
        if (report.type !== 'inbound-rtp') return;
        const now = report.timestamp;
        const bytes = report.bytesReceived;
        const frames = report.framesDecoded;
        if (lastRecvResult && lastRecvResult.get(report.id)) {
            let graphName;
            if (adapter.browserDetails.browser === 'firefox') {
                const graphId = ssrc2track.indexOf(report.ssrc >>> 0);
                graphName = ['low', 'mid', 'hi'][graphId];
            } else {
                graphName = res2.get(report.trackId).trackIdentifier;
            }
            if (!bitrateSeries[graphName]) {
                return;
            }

            // calculate bitrate
            const bitrate = 8000 * (bytes - lastRecvResult.get(report.id).bytesReceived) /
                (now - lastRecvResult.get(report.id).timestamp);

            bitrateSeries[graphName].addPoint(now, bitrate);
            bitrateGraphs[graphName].setDataSeries([bitrateSeries[graphName]]);
            bitrateGraphs[graphName].updateEndDate();

            //  calculate framerate.
            const framerate = 1000 * (frames - lastRecvResult.get(report.id).framesDecoded) /
                (now - lastRecvResult.get(report.id).timestamp);
            framerateSeries[graphName].addPoint(now, framerate);
            framerateGraphs[graphName].setDataSeries([framerateSeries[graphName]]);
            framerateGraphs[graphName].updateEndDate();
        }
    });
    lastRecvResult = res2;
}
