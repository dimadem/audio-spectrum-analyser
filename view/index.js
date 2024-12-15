/**
 * Spectrum Analyzer View Component
 * Displays real-time frequency spectrum analysis with peak detection
 * @extends HTMLElement
 */
class spectrum_analyser_View extends HTMLElement {
    constructor(patchConnection) {
        super();
        this.patchConnection = patchConnection;
        this.classList = "main-view-element";
        this.innerHTML = this.getHTML();

        // Constants
        this.SAMPLE_RATE = 44100;
        this.MIN_FREQ = 20;
        this.MAX_FREQ = this.SAMPLE_RATE / 2;
        this.MIN_DB = -100;
        this.MAX_DB = 0;

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

    /**
     * Applies Hamming window function to smooth frequency response
     * and reduce spectral leakage at the edges of the analysis window
     * @param {Array<number>} magnitudes - Array of frequency magnitudes
     * @returns {Array<number>} Windowed magnitude values
     */
    applyWindowFunction(magnitudes) 
    {
        return magnitudes.map((mag, i) => {
            // Hamming window
            const window = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (magnitudes.length - 1));
            return mag * window;
        });
    }

    /**
     * Converts linear frequency scale to logarithmic scale for display
     * Maps frequencies to x-coordinates using logarithmic distribution
     * @param {number} index - Current frequency bin index
     * @param {number} totalPoints - Total number of frequency bins
     * @param {number} width - Available width for drawing
     * @returns {number} X-coordinate position in logarithmic scale
     */
    logScale(index, totalPoints, width) {
        // Array of frequencies from HTML
        const frequencies = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
        
        // Get current frequency for index
        const currentFreq = (index / totalPoints) * (this.SAMPLE_RATE / 2);
        
        // Find x position for this frequency
        const position = Math.log10(currentFreq / frequencies[0]) / Math.log10(frequencies[frequencies.length - 1] / frequencies[0]);
        return position * width;
    }

    /**
     * Converts magnitude values to decibels (dB) with normalization
     * Uses standard formula: dB = 20 * log10(magnitude)
     * @param {number} magnitude - Input magnitude value
     * @returns {number} Normalized dB value between 0 and 1
     */
    amplitudeToDb(magnitude) 
    {
        const db = 20 * Math.log10(Math.max(magnitude, 1e-6));
        return Math.max(0, (db - this.MIN_DB) / (this.MAX_DB - this.MIN_DB));
    }

    /**
     * Main visualization update function
     * Handles drawing of spectrum analyzer display including:
     * - Frequency spectrum (green)
     * - Peak detection (red)
     * - Frequency/dB grid
     * - Axis labels
     * @param {Object} value - Contains magnitudes and peakMagnitudes arrays
     */
    updateVisualization(value) {
        const canvas = this.querySelector('#visualization');
        if (!canvas) return;
    
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        const padding = {
            left: 50,    // for dB
            right: 50,   // for 20kHz
            top: 20,     // for 0 dB
            bottom: 30   // for all Frequencies
        };
    
        // clean canvas
        ctx.clearRect(0, 0, width, height);
        
        // plot width and height
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;
    
        // move the origin to the top-left corner of the plot
        ctx.save();
        ctx.translate(padding.left, padding.top);
        
        // draw the grid
        this.drawGrid(ctx, plotWidth, plotHeight);
    
        // draw the spectrum
        const windowedMagnitudes = this.applyWindowFunction(value.magnitudes);
        ctx.beginPath();
        ctx.strokeStyle = 'rgb(0, 255, 0)';
        for (let i = 0; i < windowedMagnitudes.length; i++) {
            const x = this.logScale(i, windowedMagnitudes.length - 1, plotWidth);
            const normalizedHeight = this.amplitudeToDb(windowedMagnitudes[i]);
            const y = plotHeight - (normalizedHeight * plotHeight);
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    
        // Peaks
        ctx.beginPath();
        ctx.strokeStyle = 'rgb(255, 0, 0)';
        for (let i = 0; i < value.peakMagnitudes.length; i++) {
            const x = this.logScale(i, value.peakMagnitudes.length - 1, plotWidth);
            const normalizedHeight = this.amplitudeToDb(value.peakMagnitudes[i]);
            const y = plotHeight - (normalizedHeight * plotHeight);
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        // draw the peaks
        ctx.restore();
    }
    
    /**
     * Draws frequency/amplitude grid with logarithmic frequency scale
     * and linear dB scale. Includes axis labels and graduations.
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} width - Available width for grid
     * @param {number} height - Available height for grid
     */
    drawGrid(ctx, width, height) {
        ctx.strokeStyle = 'rgba(128, 128, 128, 0.2)';
        ctx.lineWidth = 0.5;
        
        // Vertical lines for frequencies
        const frequencies = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
        frequencies.forEach(freq => {
            const x = (Math.log10(freq / 20) / Math.log10(20000 / 20)) * width;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
    
            // Frequency labels at bottom
            ctx.save();
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center';
            ctx.font = '10px Monospace';
            const label = freq >= 1000 ? `${freq/1000}kHz` : `${freq} Hz`;
            ctx.fillText(label, x, height + 15);
            ctx.restore();
        });
        
        // Horizontal lines for dB
        const dbValues = [0, -20, -40, -60, -80, -100];
        dbValues.forEach(db => {
            const y = height * (Math.abs(db) / Math.abs(this.MIN_DB));
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
    
            // dB labels on left
            ctx.save();
            ctx.fillStyle = 'black';
            ctx.textAlign = 'right';
            ctx.font = '10px Monospace';
            ctx.fillText(`${db} db`, -5, y + 3);
            ctx.restore();
        });
    }

    /**
     * Loads HTML template for the component
     * @returns {string} HTML content
     * @throws {Error} If template loading fails
     */
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
