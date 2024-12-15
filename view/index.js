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

    // window height function
    applyWindowFunction(magnitudes) 
    {
        return magnitudes.map((mag, i) => {
            // Hamming window
            const window = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (magnitudes.length - 1));
            return mag * window;
        });
    }

    // logScale function
    logScale(index, totalPoints, width) {
        // Массив частот из HTML
        const frequencies = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
        
        // Получаем текущую частоту для индекса
        const currentFreq = (index / totalPoints) * (this.SAMPLE_RATE / 2);
        
        // Находим позицию x для этой частоты
        const position = Math.log10(currentFreq / frequencies[0]) / Math.log10(frequencies[frequencies.length - 1] / frequencies[0]);
        return position * width;
    }

    // // Добавить метод отрисовки сетки
    // drawGrid(ctx, width, height) {
    //     ctx.strokeStyle = 'rgba(128, 128, 128, 0.8)';
    //     ctx.lineWidth = 0.5;
        
    //     // Вертикальные линии по частотам
    //     const frequencies = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    //     frequencies.forEach(freq => {
    //         const x = (Math.log10(freq / 20) / Math.log10(20000 / 20)) * width;
    //         ctx.beginPath();
    //         ctx.moveTo(x, 0);
    //         ctx.lineTo(x, height);
    //         ctx.stroke();

    //         // Добавляем подпись
    //         ctx.save();
    //         ctx.fillStyle = 'black';
    //         ctx.textAlign = 'center';
    //         ctx.font = '10px Monospace';
            
    //         // Форматируем текст (kHz для больших частот)
    //         const label = freq >= 1000 ? `${freq/1000} kHz` : `${freq} Hz`;
    //         ctx.fillText(label, x, height - 5);
    //         ctx.restore();
    //     });
        
    //     // Горизонтальные линии по дБ
    //     const dbValues = [0, -20, -40, -60, -80, -100];
    //     dbValues.forEach(db => {
    //         // Инвертируем расчет Y координаты
    //         const y = height - (height * ((db - this.MIN_DB) / (this.MAX_DB - this.MIN_DB)));
    //         ctx.beginPath();
    //         ctx.moveTo(0, y);
    //         ctx.lineTo(width, y);
    //         ctx.stroke();

    //         ctx.save();
    //         ctx.fillStyle = 'black';
    //         ctx.textAlign = 'right';
    //         ctx.font = '10px Monospace';
    //         ctx.fillText(`${db} dB`, width - 5, y + 12); // Смещаем текст чуть ниже линии
    //         ctx.restore();
    //     });
    // }

    // change amplitude to db
    amplitudeToDb(magnitude) 
    {
        const db = 20 * Math.log10(Math.max(magnitude, 1e-6));
        return Math.max(0, (db - this.MIN_DB) / (this.MAX_DB - this.MIN_DB));
    }

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
    
        // Пики
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
    
    // Обновляем отрисовку сетки
    drawGrid(ctx, width, height) {
        ctx.strokeStyle = 'rgba(128, 128, 128, 0.2)';
        ctx.lineWidth = 0.5;
        
        // Вертикальные линии по частотам
        const frequencies = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
        frequencies.forEach(freq => {
            const x = (Math.log10(freq / 20) / Math.log10(20000 / 20)) * width;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
    
            // Подписи частот внизу
            ctx.save();
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center';
            ctx.font = '10px Monospace';
            const label = freq >= 1000 ? `${freq/1000}kHz` : `${freq} Hz`;
            ctx.fillText(label, x, height + 15);
            ctx.restore();
        });
        
        // Горизонтальные линии по дБ
        const dbValues = [0, -20, -40, -60, -80, -100];
        dbValues.forEach(db => {
            const y = height * (Math.abs(db) / Math.abs(this.MIN_DB));
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
    
            // Подписи dB слева
            ctx.save();
            ctx.fillStyle = 'black';
            ctx.textAlign = 'right';
            ctx.font = '10px Monospace';
            ctx.fillText(`${db} db`, -5, y + 3);
            ctx.restore();
        });
    }

    // updateVisualization(value) {
    //     const canvas = this.querySelector('#visualization');
    //     if (!canvas) return;

    //     const ctx = canvas.getContext('2d');
    //     const width = canvas.width;
    //     const height = canvas.height;

    //     ctx.clearRect(0, 0, width, height);
    //     this.drawGrid(ctx, width, height);
    //     // apply window function to magnitudes
    //     const windowedMagnitudes = this.applyWindowFunction(value.magnitudes);

    //     // magnitudes rendering
    //     ctx.beginPath();
    //     ctx.strokeStyle = 'rgb(0, 255, 0)';
    //     for (let i = 0; i < windowedMagnitudes.length; i++) {
    //         const x = this.logScale(i, windowedMagnitudes.length - 1, width);
    //         // const x = i * width / windowedMagnitudes.length;
    //         const normalizedHeight = this.amplitudeToDb(windowedMagnitudes[i]);
    //         const y = height - (normalizedHeight * height);
            
    //         if (i === 0) ctx.moveTo(x, y);
    //         else ctx.lineTo(x, y);
    //     }
    //     ctx.stroke();

    //     // peaks rendering
    //     ctx.beginPath();
    //     ctx.strokeStyle = 'rgb(255, 0, 0)';
    //     for (let i = 0; i < value.peakMagnitudes.length; i++) {
    //         const x = this.logScale(i, value.peakMagnitudes.length - 1, width);
    //         // const x = i * width / value.peakMagnitudes.length;
    //         const normalizedHeight = this.amplitudeToDb(value.peakMagnitudes[i]);
    //         const y = height - (normalizedHeight * height);
            
    //         if (i === 0) ctx.moveTo(x, y);
    //         else ctx.lineTo(x, y);
    //     }
    //     ctx.stroke();
    // }

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
