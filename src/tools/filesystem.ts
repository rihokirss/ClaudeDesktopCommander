import path from "path";
import { sshClient } from '../ssh-client.js';

// Store allowed directories on the remote Linux machine
const allowedDirectories: string[] = [
    '/home/rix',  // Remote user's home directory
    '/tmp'        // Temporary directory
];

// Normalize all paths consistently for Linux
function normalizePath(p: string): string {
    return path.posix.normalize(p).toLowerCase();
}

function expandHome(filepath: string): string {
    if (filepath.startsWith('~/') || filepath === '~') {
        return path.posix.join('/home/rix', filepath.slice(1));
    }
    return filepath;
}

// Security utilities
export async function validatePath(requestedPath: string): Promise<string> {
    const expandedPath = expandHome(requestedPath);
    
    // Always use posix paths for Linux remote server
    const absolute = path.posix.isAbsolute(expandedPath)
        ? path.posix.normalize(expandedPath)
        : path.posix.join('/home/rix', expandedPath);
        
    const normalizedRequested = normalizePath(absolute);

    // Check if path is within allowed directories
    const isAllowed = allowedDirectories.some(dir => normalizedRequested.startsWith(normalizePath(dir)));
    if (!isAllowed) {
        throw new Error(`Access denied - path outside allowed directories: ${absolute}`);
    }

    // For remote servers, check for symlinks by using readlink command
    try {
        const { stdout, code } = await sshClient.executeCommand(`readlink -f "${absolute}"`);
        if (code !== 0) {
            throw new Error(`Failed to resolve path: ${absolute}`);
        }
        
        const realPath = stdout.trim();
        const normalizedReal = normalizePath(realPath);
        
        const isRealPathAllowed = allowedDirectories.some(dir => normalizedReal.startsWith(normalizePath(dir)));
        if (!isRealPathAllowed) {
            throw new Error("Access denied - symlink target outside allowed directories");
        }
        
        return realPath;
    } catch (error) {
        // For paths that don't exist yet, verify parent directory exists and is allowed
        const parentDir = path.posix.dirname(absolute);
        try {
            const { stdout, code } = await sshClient.executeCommand(`readlink -f "${parentDir}"`);
            if (code !== 0) {
                throw new Error(`Failed to resolve parent directory: ${parentDir}`);
            }
            
            const realParentPath = stdout.trim();
            const normalizedParent = normalizePath(realParentPath);
            
            const isParentAllowed = allowedDirectories.some(dir => normalizedParent.startsWith(normalizePath(dir)));
            if (!isParentAllowed) {
                throw new Error("Access denied - parent directory outside allowed directories");
            }
            
            return absolute;
        } catch (error) {
            throw new Error(`Parent directory does not exist or cannot be accessed: ${parentDir}`);
        }
    }
}

// File operation tools
export async function readFile(filePath: string): Promise<string> {
    const validPath = await validatePath(filePath);
    return sshClient.readFile(validPath);
}

export async function writeFile(filePath: string, content: string): Promise<void> {
    const validPath = await validatePath(filePath);
    await sshClient.writeFile(validPath, content);
}

export async function readMultipleFiles(paths: string[]): Promise<string[]> {
    return Promise.all(
        paths.map(async (filePath: string) => {
            try {
                const validPath = await validatePath(filePath);
                const content = await sshClient.readFile(validPath);
                return `${filePath}:\n${content}\n`;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                return `${filePath}: Error - ${errorMessage}`;
            }
        }),
    );
}

export async function createDirectory(dirPath: string): Promise<void> {
    const validPath = await validatePath(dirPath);
    await sshClient.mkdir(validPath, true); // true for recursive creation
}

export async function listDirectory(dirPath: string): Promise<string[]> {
    const validPath = await validatePath(dirPath);
    
    // Use ls command to get file info on remote system
    const { stdout } = await sshClient.executeCommand(`ls -la "${validPath}"`);
    
    // Parse ls output to get file types
    return stdout.split('\n')
        .filter(line => line.trim() && !line.startsWith('total'))
        .map(line => {
            const isDir = line.startsWith('d');
            // File name is everything after permissions, user, group, size, date (typically field 9+)
            const fields = line.trim().split(/\s+/);
            // Join all fields from index 8 onward to handle filenames with spaces
            const name = fields.slice(8).join(' ');
            return `${isDir ? "[DIR]" : "[FILE]"} ${name}`;
        });
}

export async function moveFile(sourcePath: string, destinationPath: string): Promise<void> {
    const validSourcePath = await validatePath(sourcePath);
    const validDestPath = await validatePath(destinationPath);
    
    // Use mv command on remote system
    const { stdout, stderr, code } = await sshClient.executeCommand(
        `mv "${validSourcePath}" "${validDestPath}"`
    );
    
    if (code !== 0) {
        throw new Error(`Failed to move file: ${stderr}`);
    }
}

export async function searchFiles(rootPath: string, pattern: string): Promise<string[]> {
    const validPath = await validatePath(rootPath);
    
    // Use find command to search on remote system
    const { stdout, code } = await sshClient.executeCommand(
        `find "${validPath}" -type f -name "*${pattern}*" 2>/dev/null || true`
    );
    
    if (code !== 0 && code !== 1) { // find exits with 1 if no matches
        return [];
    }
    
    return stdout.split('\n').filter(Boolean);
}

export async function getFileInfo(filePath: string): Promise<Record<string, any>> {
    const validPath = await validatePath(filePath);
    
    // Use stat command to get file info on remote system
    const { stdout: statOutput, code: statCode } = await sshClient.executeCommand(
        `stat -c "%s|%Y|%X|%W|%F|%a" "${validPath}"`
    );
    
    if (statCode !== 0) {
        throw new Error(`File not found: ${validPath}`);
    }
    
    const [size, mtime, atime, ctime, type, permissions] = statOutput.trim().split('|');
    const isDirectory = type.includes('directory');
    
    return {
        size: parseInt(size, 10),
        created: new Date(parseInt(ctime, 10) * 1000).toISOString(),
        modified: new Date(parseInt(mtime, 10) * 1000).toISOString(),
        accessed: new Date(parseInt(atime, 10) * 1000).toISOString(),
        isDirectory,
        isFile: !isDirectory,
        permissions,
        type
    };
}

export function listAllowedDirectories(): string[] {
    return allowedDirectories;
}