import {
  logAIDiagnostic,
  getAIDiagnosticLogContent,
  AIDiagnosticEntry,
} from './ai-diagnostic-log-service'; // Adjust path as necessary
import fs from 'fs/promises';
import path from 'path';

// Mock fs/promises
jest.mock('fs/promises');
const mockAppendFile = fs.appendFile as jest.Mock;
const mockReadFile = fs.readFile as jest.Mock;
const mockAccess = fs.access as jest.Mock;

// Use the same log file path logic as in the service
const TEST_DIAGNOSTIC_LOG_FILE_PATH = path.join(process.cwd(), '.ai-diagnostics.log.jsonl');

// Hold original console.error and restore it
let originalConsoleError: typeof console.error;

beforeEach(() => {
  mockAppendFile.mockReset();
  mockReadFile.mockReset();
  mockAccess.mockReset();

  // Default behavior: fs operations succeed
  mockAccess.mockResolvedValue(undefined);
  mockAppendFile.mockResolvedValue(undefined);
  mockReadFile.mockResolvedValue(''); // Default to empty file

  // Mock console.error
  originalConsoleError = console.error;
  console.error = jest.fn();
});

afterEach(() => {
  // Restore console.error
  console.error = originalConsoleError;
});

describe('AI Diagnostic Log Service', () => {
  describe('logAIDiagnostic', () => {
    const sampleEntryData: Omit<AIDiagnosticEntry, 'timestamp'> = {
      flowName: 'test-flow',
      input: { data: 'sample input' },
      error: { message: 'sample error' },
      userFacingMessage: 'An error occurred.',
    };

    it('should successfully append a log entry', async () => {
      await logAIDiagnostic(sampleEntryData);

      expect(mockAppendFile).toHaveBeenCalledTimes(1);
      expect(mockAppendFile).toHaveBeenCalledWith(TEST_DIAGNOSTIC_LOG_FILE_PATH, expect.any(String), 'utf-8');

      const writtenContent = mockAppendFile.mock.calls[0][1] as string;
      expect(writtenContent.endsWith('\n')).toBe(true);

      const parsedEntry = JSON.parse(writtenContent.trimEnd());
      expect(parsedEntry).toMatchObject(sampleEntryData);
      expect(parsedEntry.timestamp).toBeDefined();
      // Check if timestamp is a recent ISO string (within a few seconds)
      const dateDiff = Math.abs(new Date().getTime() - new Date(parsedEntry.timestamp).getTime());
      expect(dateDiff).toBeLessThan(5000); // Within 5 seconds
    });

    it('should not throw if fs.appendFile fails, but should log an error', async () => {
      const appendError = new Error('Disk full');
      mockAppendFile.mockRejectedValueOnce(appendError);

      // Use a try-catch to ensure the function itself doesn't throw,
      // or simply call it and rely on the test runner if it's an unhandled promise rejection.
      // For this test, we'll verify console.error was called.
      await expect(logAIDiagnostic(sampleEntryData)).resolves.not.toThrow();

      expect(console.error).toHaveBeenCalledWith(
        '[AI Diagnostic Log Service] Error writing to diagnostic log file:',
        appendError
      );
    });
  });

  describe('getAIDiagnosticLogContent', () => {
    it('should return content if log file exists and is not empty', async () => {
      const sampleContent = '{"key": "value"}\n{"key2": "value2"}';
      mockReadFile.mockResolvedValueOnce(sampleContent);

      const result = await getAIDiagnosticLogContent();
      expect(fs.access).toHaveBeenCalledWith(TEST_DIAGNOSTIC_LOG_FILE_PATH);
      expect(fs.readFile).toHaveBeenCalledWith(TEST_DIAGNOSTIC_LOG_FILE_PATH, 'utf-8');
      expect(result).toEqual({ success: true, content: sampleContent });
    });

    it('should return empty content if log file exists and is empty', async () => {
      mockReadFile.mockResolvedValueOnce(''); // File is empty

      const result = await getAIDiagnosticLogContent();
      expect(result).toEqual({ success: true, content: "" });
    });

    it('should return empty content if log file exists and contains only whitespace', async () => {
      mockReadFile.mockResolvedValueOnce('   \n   '); // File with only whitespace

      const result = await getAIDiagnosticLogContent();
      expect(result).toEqual({ success: true, content: "" });
    });

    it('should return empty content if log file does not exist (ENOENT)', async () => {
      mockAccess.mockRejectedValueOnce({ code: 'ENOENT' });

      const result = await getAIDiagnosticLogContent();
      expect(mockReadFile).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, content: "" });
    });

    it('should return failure if fs.access throws an unexpected error', async () => {
      const accessError = new Error('Permission denied');
      mockAccess.mockRejectedValueOnce(accessError);

      const result = await getAIDiagnosticLogContent();
      expect(result).toEqual({ success: false, error: 'Could not read AI diagnostic log file.' });
      expect(console.error).toHaveBeenCalledWith(
        '[AI Diagnostic Log Service] Error reading diagnostic log content:',
        accessError
      );
    });

    it('should return failure if fs.readFile throws an unexpected error', async () => {
      const readError = new Error('IO error');
      mockReadFile.mockRejectedValueOnce(readError);

      const result = await getAIDiagnosticLogContent();
      expect(result).toEqual({ success: false, error: 'Could not read AI diagnostic log file.' });
       expect(console.error).toHaveBeenCalledWith(
        '[AI Diagnostic Log Service] Error reading diagnostic log content:',
        readError
      );
    });
  });
});
