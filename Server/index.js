import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer'; // Puppeteer for high-quality PDFs
import { v4 as uuidv4 } from 'uuid'; // For unique filenames

// Import pdf-to-printer correctly
import pkg from 'pdf-to-printer';
const { print, getPrinters } = pkg;

// --- Basic Setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Initialize Express App ---
const app = express();
const port = 3000;

// --- Middleware ---
app.use(cors()); // Enable CORS for all routes
app.use(express.json({ limit: '50mb' })); // Enable support for large JSON payloads

// --- API Endpoints ---

// Health check endpoint
app.get('/', (req, res) => res.send('Node.js Print Server is running!'));

/**
 * HIGH-QUALITY PDF Route using Puppeteer.
 * This route takes raw HTML, renders it in a headless browser, and generates
 * a perfect, vector-based PDF with selectable text. This is the preferred method.
 */
app.post('/api/print-html', async (req, res) => {
    console.log(`[${new Date().toLocaleString()}] Print request:
        IP: ${req.ip}
        User-Agent: ${req.headers['user-agent']}
        Origin: ${req.headers.origin}
        Referer: ${req.headers.referer}`);
    const { htmlContent, paperSize = 'a4', printerName } = req.body;

    if (!htmlContent) {
        return res.status(400).json({ error: 'Missing htmlContent.' });
    }

    console.log(`Received high-quality print request for printer: ${printerName || 'default'}`);

    let browser;
    try {
        // 1. Launch Puppeteer
        browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        // 2. Set the deviceScaleFactor for sharper rendering
        let viewportWidth = 1200, viewportHeight = 1600;
        if (Array.isArray(paperSize)) {
            // Convert mm to px (1mm ≈ 3.7795px)
            viewportWidth = Math.ceil(Number(paperSize[0]) * 3.7795);
            viewportHeight = Math.ceil(Number(paperSize[1]) * 3.7795);
        }
        await page.setViewport({
            width: viewportWidth,
            height: viewportHeight,
            deviceScaleFactor: 2  // Use 2 or 3 for very sharp output!
        });

        // 3. Set the HTML content
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        await page.emulateMediaType('screen');

        // 4. Prepare PDF options
        let pdfOptions = {
            printBackground: true,
            margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
        };

        if (Array.isArray(paperSize)) {
            pdfOptions.width = `${paperSize[0]}mm`;
            pdfOptions.height = `${paperSize[1]}mm`;
        } else {
            pdfOptions.format = paperSize || 'a4';
            pdfOptions.margin = { top: '20px', right: '20px', bottom: '20px', left: '20px' };
        }

        // 5. Generate the PDF (very sharp!)
        const pdfBuffer = await page.pdf(pdfOptions);

        await browser.close();

        // 6. Save and print
        const tempFilePath = path.join(__dirname, `temp_print_${uuidv4()}.pdf`);
        fs.writeFileSync(tempFilePath, pdfBuffer);

        console.log(`Printing generated PDF (${tempFilePath})`);
        await print(tempFilePath, { printer: printerName || undefined });

        fs.unlinkSync(tempFilePath);

        res.status(200).json({ message: 'High-quality print job sent successfully!' });

    } catch (error) {
        console.error('Error during Puppeteer printing:', error);
        if (browser) await browser.close();
        res.status(500).json({ error: 'Failed to generate or print PDF.', details: error.message });
    }
});


/**
 * LOWER-QUALITY PDF Route for Base64 data.
 * This route accepts a PDF that was already created in the client's browser,
 * usually as an image pasted into a PDF. It simply saves and prints the file.
 */
app.post('/api/print-base64', async (req, res) => {
    const { base64Data, printerName } = req.body;
    if (!base64Data) {
        return res.status(400).json({ error: 'Missing base64Data.' });
    }

    console.log(`Received Base64 print request for printer: ${printerName || 'default'}`);

    const tempFilePath = path.join(__dirname, `temp_print_${uuidv4()}.pdf`);
    
    // Convert Base64 string back into a file
    fs.writeFileSync(tempFilePath, Buffer.from(base64Data, 'base64'));
    
    try {
        // Send the pre-made file to the printer
        await print(tempFilePath, { printer: printerName || undefined });
        fs.unlinkSync(tempFilePath); // Clean up
        res.status(200).json({ message: 'Base64 print job sent successfully!' });
    } catch (error) {
        console.error('Error during Base64 printing:', error);
        res.status(500).json({ error: 'Failed to send print job.', details: error.message });
    }
});

/**
 * Route to get available printers.
 */
app.get('/api/printers', async (req, res) => {
    try {
        const printers = await getPrinters();
        res.status(200).json(printers);
    } catch (error) {
        console.error('Error getting printers:', error);
        res.status(500).json({ error: 'Failed to get printers.', details: error.message });
    }
});

// --- Start the Server ---
app.listen(port, () => {
    console.log(`Node.js Print Server listening at http://localhost:${port}`);
    console.log('Endpoints available:');
    console.log('  - GET /api/printers');
    console.log('  - POST /api/print-html (High Quality, Selectable Text)');
    console.log('  - POST /api/print-base64 (Lower Quality, Image-based)');
});
