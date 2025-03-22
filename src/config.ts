import path from 'path';
import process from 'process';
import os from 'os';

export const CONFIG_FILE = path.join(process.cwd(), 'config.json');
export const LOG_FILE = path.join(process.cwd(), 'server.log');
export const ERROR_LOG_FILE = path.join(process.cwd(), 'error.log');

export const DEFAULT_COMMAND_TIMEOUT = 1000; // milliseconds

// Default SSH configuration with obfuscated/generic values
export const DEFAULT_SSH_CONFIG = {
  host: 'your-server-ip',
  username: 'your-username',
  privateKeyPath: path.join(os.homedir(), '.ssh', 'id_rsa'),
  port: 22
};