const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const ThermalPrinter = require("node-thermal-printer").printer;
const PrinterTypes = require("node-thermal-printer").types;

let mainWindow;

const configPath = path.join(app.getPath('userData'), 'config.json');

// Helper to get saved printer name
function getSavedPrinterName() {
    try {
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            return config.printerName || 'Printer_USB_Printer_Port';
        }
    } catch (e) {
        console.error("Config read error:", e);
    }
    return 'Printer_USB_Printer_Port';
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'public', 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    mainWindow.loadURL('http://165.245.209.178/');
    mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

// Handle UI requests to GET the name
ipcMain.handle('get-printer-name', () => {
    return getSavedPrinterName();
});

// Handle UI requests to SAVE the name
ipcMain.handle('save-printer-name', (event, name) => {
    try {
        fs.writeFileSync(configPath, JSON.stringify({ printerName: name }, null, 2));
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Updated print handler utilizing the dynamic name
ipcMain.handle('print-receipt', async (event, order) => {
    try {
        let printer = new ThermalPrinter({
            type: PrinterTypes.EPSON,
            width: 32,
            characterSet: 'PC858_EURO',
            interface: 'placeholder'
        });

        // ... (Your receipt layout structure remains exactly the same)
        printer.alignCenter();
        printer.setTextDoubleHeight();
        printer.setTextDoubleWidth();
        printer.println("YANGI BUYURTMA");
        printer.drawLine();
        printer.setTextNormal();
        printer.println(`Stol: ${order.tableNumber}`);
        printer.drawLine();
        order.items.forEach((item) => {
            printer.leftRight(`${item.name}`, `x${item.quantity}`);
        });
        printer.drawLine();
        printer.bold(true);
        printer.println(`JAMI: ${order.storeTotal.toLocaleString()} so'm`);
        printer.bold(false);
        printer.partialCut();

        const buffer = printer.getBuffer();
        const tempFilePath = path.join(app.getPath('home'), '.receipt_print.bin');
        fs.writeFileSync(tempFilePath, buffer);

        // 👇 FETCH THE DYNAMIC NAME INSTEAD OF HARDCODING 👇
        const printerName = getSavedPrinterName();

        const command = `lp -d ${printerName} -o raw "${tempFilePath}"`;

        return new Promise((resolve) => {
            exec(command, (error) => {
                if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

                if (error) {
                    console.warn(`Printing to ${printerName} failed, falling back to default...`);
                    // System default fallback
                    exec(`lp -o raw "${tempFilePath}"`, (fallbackError) => {
                        if (fallbackError) resolve({ success: false, error: fallbackError.message });
                        else resolve({ success: true });
                    });
                } else {
                    resolve({ success: true });
                }
            });
        });

    } catch (error) {
        return { success: false, error: error.message };
    }
});