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
            this.updateVisualization(value.peakMagnitudes);
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
        const totalFrequencies = magnitudes.length;
        //2. size of each pixel related to screen width
        const pixelSize = Math.max(1, Math.floor(width / totalFrequencies)); 
        
        //! todo convert linear scale to logarithmic scale

        // draw the line
        magnitudes.forEach((magnitude, index) => {
            const x = index * pixelSize;
            const pixelHeight = Math.ceil(magnitude * height);
            
            // draw the pixel
            for (let y = height; y > height - pixelHeight; y -= pixelSize) {
                ctx.fillStyle = `rgba(0, 0, 0, 1.0)`;
                ctx.fillRect(x, y - pixelSize, pixelSize, pixelSize);
            }
        });
        ctx.stroke();
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
