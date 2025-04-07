// Dependecies
const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const cors = require('cors');

const app = express();
const port = 5000;

// Enable CORS for frontend communication
app.use(cors());

// Set up file upload using Multer
const upload = multer({ dest: 'uploads/' });

// Endpoint to handle file upload
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
// Check file extension
    if (!req.file.originalname.toLowerCase().endsWith('.csv')) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'Please upload a CSV file' });
    }

    // Initialize data
    const results = [];
    let headerValidated = false;

    // Create read stream and parse CSV
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => {
            // Validate required columns headers
            if (!headerValidated) {
                const requiredColumns = ['Course Title', 'Total Registrations'];
                if (!requiredColumns.every(col => col in data)) {
                    fs.unlinkSync(req.file.path);
                    headerValidated = true;
                    res.status(400).json({ 
                        message: 'Invalid CSV format: missing required columns' 
                    });
                    return;
                }
                headerValidated = true;
            }

            // Clean and transform data
            const cleanedData = {};
            for (const key in data) {
                if (key === 'Course Title') {
                    cleanedData[key] = data[key];
                } else {
                    cleanedData[key] = data[key].replace(/,/g, '').trim();
                    cleanedData[key] = isNaN(cleanedData[key]) ? cleanedData[key] : parseInt(cleanedData[key], 10);
                }
            }
            results.push(cleanedData);
        })
        .on('error', (error) => {
            // Handle CSV parsing errors
            if (!res.headersSent) {
                fs.unlinkSync(req.file.path);
                res.status(500).json({ 
                    message: 'Error processing CSV file: ' + error.message 
                });
            }
        })
        .on('end', () => {
            if (!res.headersSent) {
                if (results.length === 0) {
                    fs.unlinkSync(req.file.path);
                    res.status(400).json({ message: 'CSV file is empty' });
                } else {
                    fs.unlinkSync(req.file.path);
                    res.json(results);
                }
            }
        });
});

// Start the Express server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
