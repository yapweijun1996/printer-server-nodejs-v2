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
    const { htmlContent, paperSize = 'a4', printerName } = req.body;

    if (!htmlContent) {
        return res.status(400).json({ error: 'Missing htmlContent.' });
    }
    
    console.log(`Received high-quality print request for printer: ${printerName || 'default'}`);

    let browser;
    try {
        // 1. Launch a headless (invisible) Chromium browser
        browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        
        // 2. Set the HTML content of the page
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        // 3. Emulate a screen to ensure styles are applied correctly
        await page.emulateMediaType('screen');

        // 4. Generate the PDF. This creates a TRUE PDF, not an image.
        // The text will be selectable and clear.
        const pdfBuffer = await page.pdf({
            format: paperSize,
            printBackground: true,
            margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
        });

        await browser.close(); // Close the browser once the PDF is in memory

        // 5. Save the PDF buffer to a temporary file for the printer
        const tempFilePath = path.join(__dirname, `temp_print_${uuidv4()}.pdf`);
        fs.writeFileSync(tempFilePath, pdfBuffer);

        console.log(`Printing generated PDF (${tempFilePath})`);

        // 6. Send the file to the specified printer
        await print(tempFilePath, { printer: printerName || undefined });

        // 7. Clean up the temporary file
        fs.unlinkSync(tempFilePath);
        
        res.status(200).json({ message: 'High-quality print job sent successfully!' });

    } catch (error) {
        console.error('Error during Puppeteer printing:', error);
        if (browser) await browser.close(); // Ensure browser is closed on error
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
