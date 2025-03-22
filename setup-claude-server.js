import { homedir, platform } from 'os';
import { join, dirname } from 'path';
import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { DEFAULT_SSH_CONFIG } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Import the CONFIG_FILE path from config.ts
import { CONFIG_FILE, LOG_FILE } from '../config.js';

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

// Create project config.json file with SSH settings if it doesn't exist
function setupProjectConfig() {
    if (!existsSync(CONFIG_FILE)) {
        logToFile(`Creating config.json at: ${CONFIG_FILE}`);
        
        // Use the default SSH config from config.ts
        const defaultConfig = {
            "blockedCommands": [],
            "ssh": DEFAULT_SSH_CONFIG
        };
        
        // Create the directory if it doesn't exist
        const configDir = dirname(CONFIG_FILE);
        if (!existsSync(configDir)) {
            mkdirSync(configDir, { recursive: true });
        }
        
        writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
        logToFile('Config file created with SSH settings from config.ts');
        logToFile('IMPORTANT: Please verify the SSH configuration in config.json');
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
    // Set up project config with SSH settings
    setupProjectConfig();
    
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
    logToFile(`Project config: ${CONFIG_FILE}`);
    logToFile('\nSetup completed successfully!');
    logToFile('1. Verify the SSH settings in config.json');
    logToFile('2. Restart Claude if it\'s currently running');
    logToFile('3. The SSH-enabled Desktop Commander will be available in Claude');
    
} catch (error) {
    logToFile(`Error during setup: ${error}`, true);
    process.exit(1);
}