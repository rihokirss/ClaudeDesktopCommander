import { homedir, platform } from 'os';
import { join, dirname } from 'path';
import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Import the LOG_FILE path from config.ts
import { LOG_FILE } from '../config.js';

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

// Check if Claude config file exists and create default if not
if (!existsSync(claudeConfigPath)) {
    logToFile(`Claude config file not found at: ${claudeConfigPath}`);
    logToFile('Creating default Claude config file...');
    
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
    logToFile('Default Claude config file created.');
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
    
    // Use a unique name for the SSH-enabled server
    config.mcpServers.sshDesktopCommander = serverConfig;

    // Write the updated config back
    writeFileSync(claudeConfigPath, JSON.stringify(config, null, 2), 'utf8');
    
    logToFile('Successfully added MCP server to Claude configuration!');
    logToFile(`Claude config: ${claudeConfigPath}`);
    logToFile('\nSetup completed successfully!');
    logToFile('1. SSH settings are configured in config.ts file');
    logToFile('2. Restart Claude if it\'s currently running');
    logToFile('3. The SSH-enabled Desktop Commander will be available in Claude');
    
} catch (error) {
    logToFile(`Error during setup: ${error}`, true);
    process.exit(1);
}