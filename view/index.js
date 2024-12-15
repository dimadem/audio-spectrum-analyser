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
            this.updateVisualization(value);
        };
        // peakListener 
        this.peakListener = (value) => {
            const dataDisplay = this.querySelector('#visualization');
            if (!dataDisplay) return;
            this.updateVisualization(value);
        };

        // register the listener
        this.patchConnection.addEndpointListener('spectrum', this.peakListener);

        // register the listener
        this.patchConnection.addEndpointListener('spectrum', this.dftListener);
    }

    updateVisualization(value) 
    {
        const canvas = this.querySelector('#visualization');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        const MIN_DB = -60;
        const MAX_DB = 0;

        // clear the canvas
        ctx.clearRect(0, 0, width, height);

        // logScale is a function that maps an index to a log scale
        function logScale(index, totalPoints) {
            const minFreq = 20; // min freq Hz
            const maxFreq = 20000; // max freq Hz
            const minLog = Math.log10(minFreq);
            const maxLog = Math.log10(maxFreq);
            
            // calculate the frequency at the index
            const freq = Math.pow(10, minLog + (index / totalPoints) * (maxLog - minLog));
            // map the frequency to a position on the canvas
            return (Math.log10(freq) - minLog) / (maxLog - minLog) * width;
        }

        // draw the spectrum
        ctx.beginPath();
        ctx.strokeStyle = 'rgb(0, 255, 0)';
        for (let i = 0; i < value.magnitudes.length; i++) {
            const x = logScale(i, value.magnitudes.length - 1);
            const dbValue = 20 * Math.log10(value.magnitudes[i]);
            const normalizedHeight = Math.max(0, (dbValue - MIN_DB) / (MAX_DB - MIN_DB));
            const y = height - (normalizedHeight * height);
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // draw the peaks
        ctx.beginPath();
        ctx.strokeStyle = 'rgb(255, 0, 0)';
        for (let i = 0; i < value.peakMagnitudes.length; i++) {
            const x = logScale(i, value.peakMagnitudes.length - 1);
            const dbValue = 20 * Math.log10(value.peakMagnitudes[i]);
            const normalizedHeight = Math.max(0, (dbValue - MIN_DB) / (MAX_DB - MIN_DB));
            const y = height - (normalizedHeight * height);
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
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
