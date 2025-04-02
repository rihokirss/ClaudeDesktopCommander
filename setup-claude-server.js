import { homedir, platform } from 'os';
import { join, dirname } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Import the LOG_FILE and CONFIG_FILE paths from config.ts
//import { LOG_FILE, CONFIG_FILE } from 'config.js';
import * as path from 'path';
import * as process from 'process';

// Määratleme ise need konstandid
const CONFIG_FILE = path.join(process.cwd(), 'config.json');
const LOG_FILE = path.join(process.cwd(), 'server.log');

// Determine OS and set appropriate claude config path
const isWindows = platform() === 'win32';
const claudeConfigPath = isWindows
    ? join(process.env.APPDATA, 'Claude', 'claude_desktop_config.json')
    : join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');

function logToFile(message, isError = false) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${isError ? 'ERROR: ' : ''}${message}\n`;
    try {
        appendFileSync(LOG_FILE, logMessage);
        console.log(message);
    } catch (err) {
        console.error(`Failed to write to log file: ${err.message}`);
    }
}

// Check if config.json exists and create a basic one if it doesn't
if (!existsSync(CONFIG_FILE)) {
    logToFile(`Config file not found at: ${CONFIG_FILE}`);
    logToFile('Creating default config.json file...');
    
    // Create default config
    const defaultConfig = {
        "blockedCommands": [
            "format", "mount", "umount", "mkfs", "fdisk", "dd", 
            "sudo", "su", "passwd", "adduser", "useradd", "usermod", "groupadd"
        ],
        "allowedDirectories": [
            "/tmp",
            join("/home", homedir().split('/').pop()) // Current user's home directory
        ],
        "ssh": {
            "host": "your-server-ip",
            "username": "your-username",
            "privateKeyPath": join(homedir(), '.ssh', 'id_rsa'),
            "port": 22
        }
    };
    
    writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
    logToFile('Default config.json file created.');
}

// Check if Claude config file exists and create default if not
if (!existsSync(claudeConfigPath)) {
    log(`Claude config file not found at: ${claudeConfigPath}`);
    log('Creating default Claude config file...');
    
    // Create the directory if it doesn't exist
    const configDir = dirname(claudeConfigPath);
    if (!existsSync(configDir)) {
        mkdirSync(configDir, { recursive: true });
    }
    
    // Create default config
    const defaultConfig = {
        "serverConfig": isWindows
            ? {
                "command": "cmd.exe",
                "args": ["/c"]
              }
            : {
                "command": "/bin/sh",
                "args": ["-c"]
              }
    };
    
    writeFileSync(claudeConfigPath, JSON.stringify(defaultConfig, null, 2));
    log('Default Claude config file created.');
}

try {
    // Read existing Claude config
    const configData = readFileSync(claudeConfigPath, 'utf8');
    const config = JSON.parse(configData);

    // Prepare the server config
    const serverConfig = {
        "command": "node",
        "args": [
            join(projectRoot, 'dist', 'index.js')
        ],
        "cwd": projectRoot
    };

    // Add or update the MCP server config
    if (!config.mcpServers) {
        config.mcpServers = {};
    }
    
    // Use "remoteCommander" as the MCP server name
    config.mcpServers.remoteCommander = serverConfig;

    // Write the updated config back
    writeFileSync(claudeConfigPath, JSON.stringify(config, null, 2), 'utf8');
    
    logToFile('Successfully added MCP server to Claude configuration!');
    logToFile(`Claude config: ${claudeConfigPath}`);
    logToFile('\nSetup completed successfully!');
    logToFile('1. SSH settings are configured in config.json file');
    logToFile('2. Restart Claude if it\'s currently running');
    logToFile('3. The SSH-enabled Desktop Commander will be available in Claude');
    
} catch (error) {
    log(`Error during setup: ${error}`, true);
    process.exit(1);
}