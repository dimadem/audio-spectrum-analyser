class spectrum_analyser_View extends HTMLElement {
    constructor(patchConnection) {
        super();
        this.patchConnection = patchConnection;
        this.classList = "main-view-element";
        this.innerHTML = this.getHTML();

        // dftListener is a function 
        // that will be called whenever the spectrum parameter changes
        this.dftListener = (value) => 
        {
            const dataDisplay = this.querySelector('#visualization');
            if (!dataDisplay) return;
            this.updateVisualization(value.magnitudes);
        };

        // take a look at spectrum and realign the visualization
        this.patchConnection.addEndpointListener('spectrum', this.dftListener);
    }

    updateVisualization(magnitudes) 
    {
        const canvas = this.querySelector('#visualization');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // clean canvas before drawing
        ctx.clearRect(0, 0, width, height);

        // draw the line
        ctx.beginPath();
        ctx.imageSmoothingEnabled = false;

        //! calculate the pixel size
        //1. magnitudes.length -> total number of frequencies
        //2. size of each pixel related to screen width
        const toLog = (value, min, max) => min * Math.pow(max/min, (value - min) / (max - min));
        const smoothingFactor = 0.97;

        if (!this.previousMagnitudes) {
            this.previousMagnitudes = new Float32Array(magnitudes.length).fill(0);
        }

        const totalFrequencies = magnitudes.length;
        const pixelSize = Math.max(1, Math.floor(width / totalFrequencies));
        const logMagnitudes = new Float32Array(totalFrequencies);

        ctx.fillStyle = `rgba(0, 0, 0, 1.0)`;
        for (let i = 1; i < totalFrequencies; i++) {
            const logIndex = toLog(i, 1, totalFrequencies - 1);
            const low = Math.floor(logIndex);
            const high = Math.ceil(logIndex);
            const weight = logIndex - low;
            
            
            const currentValue = magnitudes[low] + (magnitudes[high] - magnitudes[low]) * weight;
            logMagnitudes[i] = currentValue * (1 - smoothingFactor) + this.previousMagnitudes[i] * smoothingFactor;
            
            const x = i * pixelSize;
            const pixelHeight = Math.ceil(logMagnitudes[i] * height);
            ctx.fillRect(x, height - pixelHeight, pixelSize, pixelHeight);
        }
        ctx.stroke();
    }

    connectedCallback() {
        this.paramListener = (event) => {
            const horisontal_slider = this.querySelector('#horisontal_slider');
            if (horisontal_slider)
                horisontal_slider.value = event.value;

            // const vertical_slider = this.querySelector('#vertical_slider');
            // if (vertical_slider)
            //     vertical_slider.value = event.value;
        }

        // Attach a parameter listener that will be triggered when any param is moved
        this.patchConnection.addAllParameterListener (this.paramListener);

        for (const param of this.querySelectorAll (".gui"))
        {
            // When one of our sliders is moved, this will send the new value to the patch.
            param.oninput = () => this.patchConnection.sendEventOrValue (param.id, param.value);

            // for each slider, request an initial update, to make sure it shows the right value
            this.patchConnection.requestParameterValue (param.id);
        }
    }


    getHTML() {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './view/index.html', false);
        try {
            xhr.send();
            if (xhr.status === 200) {
                return xhr.responseText;
            }
        } catch (error) {
            alert('Failed to load the view');
        }
    }
}

window.customElements.define ("spectrum_analyser-view", spectrum_analyser_View);

export default function createPatchView (patchConnection)
{
    return new spectrum_analyser_View (patchConnection);
}
