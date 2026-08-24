import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { ipcMain, BrowserWindow } from 'electron';
import { database } from '../database/db';

interface ConnectedDevice {
  path: string;
  port: SerialPort;
  parser: ReadlineParser;
  baudRate: number;
  boardType: string;
}

const connectedDevices = new Map<string, ConnectedDevice>();

export async function initSerialManager() {
  // List available ports
  ipcMain.handle('serial:list-ports', async () => {
    try {
      const ports = await SerialPort.list();
      return ports.map((p) => ({
        path: p.path,
        manufacturer: p.manufacturer || 'Unknown',
        serialNumber: p.serialNumber || 'N/A',
        productId: p.productId,
        vendorId: p.vendorId,
      }));
    } catch (error) {
      console.error('Error listing ports:', error);
      return [];
    }
  });

  // Connect to device
  ipcMain.handle('serial:connect', async (event, path: string, baudRate: number = 9600) => {
    try {
      if (connectedDevices.has(path)) {
        return { success: false, error: 'Device already connected' };
      }

      const port = new SerialPort({ path, baudRate });
      const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

      return new Promise((resolve) => {
        port.on('open', () => {
          const device: ConnectedDevice = {
            path,
            port,
            parser,
            baudRate,
            boardType: 'Unknown',
          };

          connectedDevices.set(path, device);

          // Listen for data
          parser.on('data', (data: string) => {
            BrowserWindow.getAllWindows()[0]?.webContents.send('serial:data', {
              path,
              data: data.trim(),
              timestamp: Date.now(),
            });
          });

          port.on('error', (err) => {
            console.error('Serial port error:', err);
          });

          port.on('close', () => {
            connectedDevices.delete(path);
            BrowserWindow.getAllWindows()[0]?.webContents.send('serial:disconnected', { path });
          });

          resolve({ success: true, path });
        });

        port.on('error', (err) => {
          resolve({ success: false, error: err.message });
        });
      });
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Disconnect from device
  ipcMain.handle('serial:disconnect', async (event, path: string) => {
    const device = connectedDevices.get(path);
    if (device) {
      device.port.close();
      connectedDevices.delete(path);
      return { success: true };
    }
    return { success: false, error: 'Device not connected' };
  });

  // Send data to device
  ipcMain.handle('serial:write', async (event, path: string, data: string) => {
    const device = connectedDevices.get(path);
    if (device) {
      device.port.write(data + '\n', (err) => {
        if (err) {
          console.error('Write error:', err);
        }
      });
      return { success: true };
    }
    return { success: false, error: 'Device not connected' };
  });
}
