export class DebugUI {
    constructor(parent) {
        this.parent = parent;
        this.dom = this.buildDOM();
        this.parent.appendChild(this.dom);

        this.processTimes = {};
        this.processCategories = {};
        this.lastUpdateTimes = {};
    }
    buildDOM() {
        let container = document.createElement('div');
        container.classList.add('debugContainer');
        return container;
    }
    show() {
        this.dom.style.display = '';
    }
    hide() {
        this.dom.style.display = 'none';
    }
    addLabel(id, text, options = {}) {
        let label = document.createElement('div');
        label.id = this.getDomIdForLabelId(id);
        label.classList.add('debugContainerLabel');
        label.innerHTML = text;

        // Append at the top
        if (options.pinToTop && this.dom.firstChild) {
            this.dom.insertBefore(label, this.dom.firstChild);
        } else {
            this.dom.appendChild(label);
        }
    }
    updateLabelText(id, text, options = {}) {
        let labelDomId = this.getDomIdForLabelId(id);
        let existingLabel = document.getElementById(labelDomId);
        if (existingLabel) {
            existingLabel.innerHTML = text;
        }

        // // Append at the top
        // if (options.pinToTop && this.dom.firstChild) {
        //     this.dom.insertBefore(label, this.dom.firstChild);
        // }
    }
    addOrUpdateLabel(id, text, options) {
        let labelDomId = this.getDomIdForLabelId(id);
        let existingLabel = document.getElementById(labelDomId);
        if (existingLabel) {
            this.updateLabelText(id, text, options);
        } else {
            this.addLabel(id, text, options);
        }
    }
    removeLabel(id) {
        let labelDomId = this.getDomIdForLabelId(id);
        let existingLabel = document.getElementById(labelDomId);
        if (existingLabel && existingLabel.parentElement) {
            existingLabel.parentElement.removeChild(existingLabel);
        }
    }
    getDomIdForLabelId(id) {
        return `DebugUI_Label_${id}`;
    }
    startTimeProcess(processTitle, options = {}) {
        if (typeof this.processTimes[processTitle] === 'undefined') {
            this.processTimes[processTitle] = {};
        }
        this.processTimes[processTitle].start = performance.now();
        if (options.numStopsRequired) {
            this.processTimes[processTitle].numStopsRequired = options.numStopsRequired;
            this.processTimes[processTitle].numStopsAccumulated = 0;
        }
        // this.lastUpdateTimes[processTitle] = performance.now();
    }
    stopTimeProcess(processTitle, category) {
        let process = this.processTimes[processTitle];
        if (typeof process === 'undefined') {
            return;
        }

        if (typeof this.processTimes[processTitle].numStopsRequired !== 'undefined') {
            this.processTimes[processTitle].numStopsAccumulated += 1;
            if (this.processTimes[processTitle].numStopsAccumulated < this.processTimes[processTitle].numStopsRequired) {
                return; // wait until we receive enough stops
            }
        }

        process.end = performance.now();

        let timeBetweenCategoryUpdates = process.end - (this.lastUpdateTimes[category] || 0);
        // console.log('time between updates', timeBetweenCategoryUpdates);
        this.lastUpdateTimes[processTitle] = performance.now();

        if (category) {
            this.lastUpdateTimes[category] = this.lastUpdateTimes[processTitle];
        }

        if (!process.start || !process.end) return;

        let time = (process.end - process.start)
        let displayTime = time.toFixed(2);
        let numStopsText = this.processTimes[processTitle].numStopsAccumulated ? `(${this.processTimes[processTitle].numStopsAccumulated} stops)` : '';
        let labelText = `${processTitle}: ${this.yellow(displayTime)} ms ${numStopsText}`;
        // this.addOrUpdateLabel(processTitle, labelText);

        // remove after 3 seconds if no updates between now and then
        setTimeout(() => {
            let timeSinceLastUpdate = performance.now() - this.lastUpdateTimes[processTitle];
            // let newTime = (this.processTimes[processTitle].end - this.processTimes[processTitle].start);
            // if (newTime === time) {
            // console.log(`${processTitle} was updated ${timeSinceLastUpdate} ago`);
            if (timeSinceLastUpdate > 1500) {
                // console.log(`remove ${processTitle}`);
                // this.removeLabel(processTitle);
            }
        }, 2000);

        if (!category) return;

        if (typeof this.processCategories[category] === 'undefined') {
            this.processCategories[category] = {
                fastest: time,
                slowest: time,
                mean: time,
                count: 1,
                numDisplayResets: 0
            };
        } else if (timeBetweenCategoryUpdates > 5000) {
            let numDisplayResets = this.processCategories[category].numDisplayResets + 1;
            this.processCategories[category] = {
                fastest: time,
                slowest: time,
                mean: time,
                count: 1,
                numDisplayResets: numDisplayResets
            };
        } else {
            let prevCount = this.processCategories[category].count;
            let prevMean = this.processCategories[category].mean;

            this.processCategories[category].fastest = Math.min(this.processCategories[category].fastest, time);
            this.processCategories[category].slowest = Math.max(this.processCategories[category].slowest, time);
            this.processCategories[category].mean = (prevCount * prevMean + time) / (prevCount + 1); // update mean
            this.processCategories[category].count += 1;
        }

        let numResets = this.processCategories[category].numDisplayResets;
        let meanT = this.processCategories[category].mean.toFixed(2);
        let minT = this.processCategories[category].fastest.toFixed(2)
        let maxT = this.processCategories[category].slowest.toFixed(2)

        let meanLabelText = `${category} (${numResets}) –– mean: ${this.yellow(meanT)} –– min: ${this.yellow(minT)} –– max: ${this.yellow(maxT)}`;
        this.addOrUpdateLabel(`mean_${category}`, meanLabelText, { pinToTop: true });
    }
    yellow(text) {
        return `<span class='debugTime'>${text}</span>`;
    }
}


