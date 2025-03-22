import { ChildProcess } from 'child_process';
import { ClientChannel } from 'ssh2';

export interface ProcessInfo {
  pid: number;
  command: string;
  cpu: string;
  memory: string;
}

export interface TerminalSession {
  pid: number;
  process: ChildProcess | null;
  sshChannel?: ClientChannel; // Added for SSH support
  lastOutput: string;
  isBlocked: boolean;
  startTime: Date;
}

export interface CommandExecutionResult {
  pid: number;
  output: string;
  isBlocked: boolean;
}

export interface ActiveSession {
  pid: number;
  isBlocked: boolean;
  runtime: number;
}

export interface CompletedSession {
  pid: number;
  output: string;
  exitCode: number | null;
  startTime: Date;
  endTime: Date;
}