// import { spawn } from 'child_process';
import { TerminalSession, CommandExecutionResult, ActiveSession } from './types.js';
import { DEFAULT_COMMAND_TIMEOUT } from './config.js';
import { sshClient } from './ssh-client.js';
import { ClientChannel } from 'ssh2';

interface CompletedSession {
  pid: number;
  output: string;
  exitCode: number | null;
  startTime: Date;
  endTime: Date;
}

// Update the TerminalSession interface in types.ts to include sshChannel
// export interface TerminalSession {
//   pid: number;
//   process: ChildProcess | null;
//   sshChannel?: ClientChannel;
//   lastOutput: string;
//   isBlocked: boolean;
//   startTime: Date;
// }

export class TerminalManager {
  private sessions: Map<number, TerminalSession> = new Map();
  private completedSessions: Map<number, CompletedSession> = new Map();
  private nextPid: number = 1000; // Starting PID for SSH commands
  
  async executeCommand(command: string, timeoutMs: number = DEFAULT_COMMAND_TIMEOUT): Promise<CommandExecutionResult> {
    // First try to establish an SSH connection
    try {
      await sshClient.connect();
    } catch (error) {
      console.error('Failed to connect to SSH server:', error);
      throw new Error(`Failed to connect to remote server: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Generate a unique ID for this session
    const pid = this.nextPid++;
    let output = '';
    
    const session: TerminalSession = {
      pid,
      process: null, // We don't use local processes anymore
      lastOutput: '',
      isBlocked: false,
      startTime: new Date()
    };
    
    this.sessions.set(pid, session);

    try {
      // Execute command on remote server
      const { channel, promise } = await sshClient.executeCommandStream(
        command,
        (data) => {
          output += data;
          session.lastOutput += data;
        },
        (data) => {
          output += data;
          session.lastOutput += data;
        }
      );
      
      // Store SSH channel for potential termination
      session.sshChannel = channel;

      // Set up timeout handling
      const timeoutHandle = setTimeout(() => {
        session.isBlocked = true;
      }, timeoutMs);

      // Handle command completion
      promise.then((code) => {
        clearTimeout(timeoutHandle);
        
        // Store completed session info
        this.completedSessions.set(pid, {
          pid,
          output: output + session.lastOutput,
          exitCode: code,
          startTime: session.startTime,
          endTime: new Date()
        });
        
        // Limit completed sessions history
        if (this.completedSessions.size > 100) {
          const oldestKey = Array.from(this.completedSessions.keys())[0];
          this.completedSessions.delete(oldestKey);
        }
        
        this.sessions.delete(pid);
      }).catch((error) => {
        console.error(`Command execution error (PID ${pid}):`, error);
      });

      // Return initial result
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            pid,
            output,
            isBlocked: session.isBlocked
          });
        }, Math.min(timeoutMs, 1000)); // Return faster for better UX
      });
    } catch (error) {
      this.sessions.delete(pid);
      throw error;
    }
  }

  getNewOutput(pid: number): string | null {
    // Check active sessions
    const session = this.sessions.get(pid);
    if (session) {
      const output = session.lastOutput;
      session.lastOutput = '';
      return output || 'No new output available';
    }

    // Check completed sessions
    const completedSession = this.completedSessions.get(pid);
    if (completedSession) {
      const runtime = (completedSession.endTime.getTime() - completedSession.startTime.getTime()) / 1000;
      const result = `Process completed with exit code ${completedSession.exitCode}\nRuntime: ${runtime.toFixed(2)}s\nFinal output:\n${completedSession.output}`;
      this.completedSessions.delete(pid); // Remove after reading
      return result;
    }

    return null;
  }

  forceTerminate(pid: number): boolean {
    const session = this.sessions.get(pid);
    if (!session || !session.sshChannel) {
      return false;
    }

    try {
      // Send termination signals to the remote process
      session.sshChannel.signal('INT'); // SIGINT first
      
      // Try SIGKILL after a delay if it's still active
      setTimeout(() => {
        if (this.sessions.has(pid) && session.sshChannel) {
          session.sshChannel.signal('KILL');
        }
      }, 1000);
      
      return true;
    } catch (error) {
      console.error(`Failed to terminate remote process ${pid}:`, error);
      return false;
    }
  }

  listActiveSessions(): ActiveSession[] {
    const now = new Date();
    return Array.from(this.sessions.values()).map(session => ({
      pid: session.pid,
      isBlocked: session.isBlocked,
      runtime: now.getTime() - session.startTime.getTime()
    }));
  }

  listCompletedSessions(): CompletedSession[] {
    return Array.from(this.completedSessions.values());
  }
}

export const terminalManager = new TerminalManager();