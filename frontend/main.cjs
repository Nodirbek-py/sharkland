const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
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
            return config.printerName || 'POS-58';
        }
    } catch (e) {
        console.error("Config read error:", e);
    }
    return 'POS-58';
}

// Get the correct printer interface for the current OS
function getPrinterInterface(printerName) {
    if (process.platform === 'win32') {
        // Windows: use shared printer path (UNC)
        return `\\\\localhost\\${printerName}`;
    }
    // macOS/Linux: we'll use lp command instead, so placeholder
    return 'placeholder';
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

// ============================================================
// CROSS-PLATFORM RAW PRINT HELPER
// Windows: node-thermal-printer execute() via shared printer
// macOS/Linux: lp -o raw command
// ============================================================
async function sendBufferToPrinter(buffer, printerName) {
    const isWin = process.platform === 'win32';

    // Windows: use node-thermal-printer's execute() with shared printer path
    try {
        const printerInterface = `\\\\localhost\\${printerName}`;
        fs.appendFileSync(printerInterface, buffer);
        return { success: true };
    } catch (error) {
        console.error('Windows print error:', error.message);
        return { success: false, error: `Printer xatosi: ${error.message}. Printerni "Sharing" yoqilganligini tekshiring.` };
    }
}

// ============================================================
// PRINT RECEIPT (Vendor buyurtma cheki)
// ============================================================
ipcMain.handle('print-receipt', async (event, order) => {
    try {
        const printerName = getSavedPrinterName();

        let printer = new ThermalPrinter({
            type: PrinterTypes.EPSON,
            width: 32,
            characterSet: 'PC858_EURO',
            interface: 'placeholder'
        });

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
        return await sendBufferToPrinter(buffer, printerName);

    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ============================================================
// PRINT HISTORY (Resepsion karta tarixi cheki)
// ============================================================
ipcMain.handle('print-history', async (event, historyData) => {
    try {
        const printerName = getSavedPrinterName();

        let printer = new ThermalPrinter({
            type: PrinterTypes.EPSON,
            width: 32,
            characterSet: 'PC858_EURO',
            interface: 'placeholder'
        });

        printer.alignCenter();
        printer.setTextDoubleHeight();
        printer.setTextDoubleWidth();
        printer.println("KARTA TARIXI");
        printer.drawLine();
        printer.setTextNormal();
        printer.println(`Ism: ${historyData.visitor.name}`);
        printer.println(`Balans: ${Number(historyData.visitor.balance).toLocaleString()} so'm`);
        printer.drawLine();

        if (!historyData.transactions || historyData.transactions.length === 0) {
            printer.println("Bugun xarid qilinmagan.");
        } else {
            historyData.transactions.forEach((tx) => {
                const time = new Date(tx.createdAt).toLocaleTimeString();
                printer.println(`${tx.location} (${time})`);
                const sign = tx.type === 'expense' ? '-' : '+';
                printer.alignRight();
                printer.println(`${sign}${Number(tx.amount).toLocaleString()} so'm`);
                printer.alignLeft();
            });
        }

        printer.drawLine();
        printer.partialCut();

        const buffer = printer.getBuffer();
        return await sendBufferToPrinter(buffer, printerName);

    } catch (error) {
        return { success: false, error: error.message };
    }
});