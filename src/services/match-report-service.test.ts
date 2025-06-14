import {
  LoggedMatchSuggestion,
  logMatchSuggestion,
  getLoggedMatchSuggestions,
  getMatchSuggestionLogRawContent,
} from './match-report-service'; // Adjust path
import type { AIMatchingMode, AIModelName } from './ai-config-service'; // Import for types
import { getPreferredAIModel as mockGetPreferredAIModel } from './ai-config-service';
import fs from 'fs/promises';
import path from 'path';

// Mock fs/promises
jest.mock('fs/promises');
const mockReadFile = fs.readFile as jest.Mock;
const mockWriteFile = fs.writeFile as jest.Mock;
const mockAccess = fs.access as jest.Mock;

// Mock ai-config-service
jest.mock('./ai-config-service', () => ({
  getPreferredAIModel: jest.fn(),
}));

// Use the same log file path logic as in the service
const TEST_LOG_FILE_PATH = path.join(process.cwd(), '.match-suggestions.log.json');

// Hold original console.error/log and restore them
let originalConsoleError: typeof console.error;
let originalConsoleLog: typeof console.log;

beforeEach(() => {
  mockReadFile.mockReset();
  mockWriteFile.mockReset();
  mockAccess.mockReset();
  (mockGetPreferredAIModel as jest.Mock).mockReset();

  // Default behavior: fs operations succeed, file exists, empty log array
  mockAccess.mockResolvedValue(undefined);
  mockWriteFile.mockResolvedValue(undefined);
  mockReadFile.mockResolvedValue(JSON.stringify([]));
  (mockGetPreferredAIModel as jest.Mock).mockResolvedValue('gemini-1.5-pro-latest'); // Default mock model

  // Mock console
  originalConsoleError = console.error;
  console.error = jest.fn();
  originalConsoleLog = console.log;
  console.log = jest.fn();
});

afterEach(() => {
  // Restore console
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});

describe('Match Report Service', () => {
  const sampleLogDataOmit: Omit<LoggedMatchSuggestion, 'timestamp' | 'modelUsed'> = {
    triggeringUserId: 'user1',
    currentItemId: 'itemA',
    currentItemName: 'Item A',
    suggestedMatches: [{ itemId: 'itemB', matchScore: 'High', ownerId: 'user2' }],
    reasoning: 'Looks similar',
    usedMatchingMode: 'advanced',
    preferencesConsidered: true,
  };

  const sampleLogDataOmitNoPrefs: Omit<LoggedMatchSuggestion, 'timestamp' | 'modelUsed' | 'preferencesConsidered'> = {
    triggeringUserId: 'user2',
    currentItemId: 'itemC',
    currentItemName: 'Item C',
    suggestedMatches: [{ itemId: 'itemD', matchScore: 'Low', ownerId: 'user3' }],
  };


  // --- Tests for internal readLogs (implicitly via exported functions) ---
  describe('readLogs behavior', () => {
    it('should return an empty array and create file if file does not exist (ENOENT)', async () => {
      mockAccess.mockRejectedValueOnce({ code: 'ENOENT' });
      // logMatchSuggestion calls readLogs, which should then call writeFile to create the empty log
      await logMatchSuggestion(sampleLogDataOmit);
      expect(mockWriteFile).toHaveBeenCalledWith(TEST_LOG_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
      // Second writeFile is for the actual new log entry
      expect(mockWriteFile).toHaveBeenCalledTimes(2);
    });

    it('should return empty array and log error if creating file fails on ENOENT', async () => {
      mockAccess.mockRejectedValueOnce({ code: 'ENOENT' });
      mockWriteFile.mockImplementationOnce(() => Promise.reject(new Error('Create failed'))); // First write (create) fails

      await logMatchSuggestion(sampleLogDataOmit);
      expect(console.error).toHaveBeenCalledWith('[Match Report Service] Error creating log file:', expect.any(Error));
      // readLogs returns [], logMatchSuggestion adds item, tries to write.
      // The first writeFile (create) failed. The second (log actual entry) should still be attempted.
      expect(mockWriteFile.mock.calls[1][0]).toBe(TEST_LOG_FILE_PATH);
      const writtenData = JSON.parse(mockWriteFile.mock.calls[1][1]);
      expect(writtenData).toHaveLength(1);
    });

    it('should return an empty array if file is empty or whitespace', async () => {
      mockReadFile.mockResolvedValueOnce('   ');
      await logMatchSuggestion(sampleLogDataOmit); // Triggers readLogs
      const writtenData = JSON.parse(mockWriteFile.mock.calls[0][1]); // Data for writeLogs
      expect(writtenData).toHaveLength(1); // New log was added to the empty list
    });

    it('should return an empty array and log error if file is invalid JSON', async () => {
      mockReadFile.mockResolvedValueOnce('invalid json');
      await logMatchSuggestion(sampleLogDataOmit);
      expect(console.error).toHaveBeenCalledWith('[Match Report Service] Error reading log file:', expect.any(SyntaxError));
      const writtenData = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(writtenData).toHaveLength(1);
    });

    it('should return an empty array and log error on other fs errors', async () => {
      mockAccess.mockRejectedValueOnce(new Error('Permission denied'));
      await logMatchSuggestion(sampleLogDataOmit);
      expect(console.error).toHaveBeenCalledWith('[Match Report Service] Error reading log file:', expect.any(Error));
      const writtenData = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(writtenData).toHaveLength(1);
    });

    it('should correctly parse valid JSON and default preferencesConsidered to false if missing', async () => {
      const existingLogNoPrefsField = { ...sampleLogDataOmitNoPrefs, timestamp: 'old-ts', modelUsed: 'gemini-1.0-pro' };
      // preferencesConsidered is missing in existingLogNoPrefsField
      mockReadFile.mockResolvedValueOnce(JSON.stringify([existingLogNoPrefsField]));

      const logs = await getLoggedMatchSuggestions(); // Calls readLogs
      expect(logs).toHaveLength(1);
      expect(logs[0].preferencesConsidered).toBe(false); // Defaulted
      expect(logs[0].currentItemId).toBe(sampleLogDataOmitNoPrefs.currentItemId);
    });

    it('should preserve preferencesConsidered if present in logs', async () => {
      const existingLogWithPrefsTrue = { ...sampleLogDataOmit, timestamp: 'old-ts', modelUsed: 'gemini-1.0-pro', preferencesConsidered: true };
      const existingLogWithPrefsFalse = { ...sampleLogDataOmit, timestamp: 'older-ts', modelUsed: 'gemini-1.0-pro', preferencesConsidered: false, currentItemId: "itemZ" };
      mockReadFile.mockResolvedValueOnce(JSON.stringify([existingLogWithPrefsTrue, existingLogWithPrefsFalse]));

      const logs = await getLoggedMatchSuggestions();
      expect(logs).toHaveLength(2);
      expect(logs.find(l => l.currentItemId === "itemA")?.preferencesConsidered).toBe(true);
      expect(logs.find(l => l.currentItemId === "itemZ")?.preferencesConsidered).toBe(false);
    });
  });

  // --- Tests for internal writeLogs (implicitly via logMatchSuggestion) ---
  describe('writeLogs behavior', () => {
    it('should be called by logMatchSuggestion with new entry prepended', async () => {
      const existingEntry = { ...sampleLogDataOmit, timestamp: 'old-ts', modelUsed: 'gemini-1.0-pro', currentItemId: 'XYZ' };
      mockReadFile.mockResolvedValueOnce(JSON.stringify([existingEntry]));
      (mockGetPreferredAIModel as jest.Mock).mockResolvedValueOnce('gemini-test-model' as AIModelName);

      await logMatchSuggestion(sampleLogDataOmit);
      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      const writtenArg = mockWriteFile.mock.calls[0][1];
      const writtenData = JSON.parse(writtenArg) as LoggedMatchSuggestion[];
      expect(writtenData).toHaveLength(2);
      expect(writtenData[0].currentItemId).toBe(sampleLogDataOmit.currentItemId); // Newest is [0]
      expect(writtenData[0].modelUsed).toBe('gemini-test-model');
      expect(writtenData[1].currentItemId).toBe('XYZ');
    });

    it('should log error if fs.writeFile fails', async () => {
      mockWriteFile.mockRejectedValueOnce(new Error('Disk Write Error'));
      await logMatchSuggestion(sampleLogDataOmit); // writeLogs is called internally
      expect(console.error).toHaveBeenCalledWith('[Match Report Service] Error writing log file:', expect.any(Error));
    });
  });

  // --- Tests for logMatchSuggestion ---
  describe('logMatchSuggestion', () => {
    it('should call readLogs and getPreferredAIModel', async () => {
      await logMatchSuggestion(sampleLogDataOmit);
      // readLogs is called, which itself calls fs.access and fs.readFile
      expect(mockAccess).toHaveBeenCalled();
      expect(mockReadFile).toHaveBeenCalled();
      expect(mockGetPreferredAIModel).toHaveBeenCalledTimes(1);
    });

    it('should add timestamp and modelUsed to the log entry', async () => {
      const testModel = 'gemini-special' as AIModelName;
      (mockGetPreferredAIModel as jest.Mock).mockResolvedValueOnce(testModel);
      await logMatchSuggestion(sampleLogDataOmit);

      const writtenData = JSON.parse(mockWriteFile.mock.calls[0][1]) as LoggedMatchSuggestion[];
      expect(writtenData[0].timestamp).toBeDefined();
      const dateDiff = Math.abs(new Date().getTime() - new Date(writtenData[0].timestamp).getTime());
      expect(dateDiff).toBeLessThan(5000); // Within 5 seconds
      expect(writtenData[0].modelUsed).toBe(testModel);
    });

    it('should default preferencesConsidered to false if not in input', async () => {
      await logMatchSuggestion(sampleLogDataOmitNoPrefs);
      const writtenData = JSON.parse(mockWriteFile.mock.calls[0][1]) as LoggedMatchSuggestion[];
      expect(writtenData[0].preferencesConsidered).toBe(false);
    });

    it('should preserve preferencesConsidered if true in input', async () => {
      await logMatchSuggestion({...sampleLogDataOmitNoPrefs, preferencesConsidered: true });
      const writtenData = JSON.parse(mockWriteFile.mock.calls[0][1]) as LoggedMatchSuggestion[];
      expect(writtenData[0].preferencesConsidered).toBe(true);
    });

    it('should truncate logs if entries exceed 500', async () => {
      const existingLogs = new Array(500).fill(null).map((_, i) => ({
        ...sampleLogDataOmit,
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
        currentItemId: `item-${i}`,
      }));
      mockReadFile.mockResolvedValueOnce(JSON.stringify(existingLogs));

      await logMatchSuggestion(sampleLogDataOmit); // This adds the 501st entry before truncation

      const writtenData = JSON.parse(mockWriteFile.mock.calls[0][1]) as LoggedMatchSuggestion[];
      expect(writtenData).toHaveLength(500);
      // The newest entry (sampleLogDataOmit) should be at the beginning
      expect(writtenData[0].currentItemId).toBe(sampleLogDataOmit.currentItemId);
      // The oldest entry from the original 500 should be gone.
      expect(writtenData.find(log => log.currentItemId === 'item-499')).toBeUndefined();
    });
  });

  // --- Tests for getLoggedMatchSuggestions ---
  describe('getLoggedMatchSuggestions', () => {
    it('should return the output of readLogs', async () => {
      const mockLogs: LoggedMatchSuggestion[] = [
        { ...sampleLogDataOmit, timestamp: 'ts1', modelUsed: 'gemini-1.0-pro', preferencesConsidered: false },
        { ...sampleLogDataOmitNoPrefs, timestamp: 'ts2', modelUsed: 'gemini-1.5-pro-latest', preferencesConsidered: false }
      ];
      // Ensure readLogs (via its fs mocks) returns these logs
      mockReadFile.mockResolvedValueOnce(JSON.stringify(mockLogs));

      const result = await getLoggedMatchSuggestions();
      expect(result).toEqual(mockLogs.map(l => ({...l, preferencesConsidered: l.preferencesConsidered ?? false }))); // readLogs defaults preferencesConsidered
    });
  });

  // --- Tests for getMatchSuggestionLogRawContent ---
  describe('getMatchSuggestionLogRawContent', () => {
    it('should return content if log file exists and is valid JSON', async () => {
      const fileContent = JSON.stringify([{ ...sampleLogDataOmit, timestamp: 'ts', modelUsed: 'gemini-1.0-pro' }]);
      mockReadFile.mockResolvedValueOnce(fileContent);
      const result = await getMatchSuggestionLogRawContent();
      expect(mockAccess).toHaveBeenCalledWith(TEST_LOG_FILE_PATH);
      expect(mockReadFile).toHaveBeenCalledWith(TEST_LOG_FILE_PATH, 'utf-8');
      expect(result).toEqual({ success: true, content: fileContent });
    });

    it('should return "[]" if log file exists and is empty or whitespace', async () => {
      mockReadFile.mockResolvedValueOnce('   ');
      const result = await getMatchSuggestionLogRawContent();
      expect(result).toEqual({ success: true, content: "[]" });
    });

    it('should return "[]" if log file does not exist (ENOENT)', async () => {
      mockAccess.mockRejectedValueOnce({ code: 'ENOENT' });
      const result = await getMatchSuggestionLogRawContent();
      expect(mockReadFile).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, content: "[]" });
    });

    it('should return failure if log file is invalid JSON', async () => {
      mockReadFile.mockResolvedValueOnce('invalid json');
      const result = await getMatchSuggestionLogRawContent();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Match suggestion log file is not valid JSON');
      expect(console.error).toHaveBeenCalledWith('[Match Report Service] Error reading raw match suggestion log content:', expect.any(SyntaxError));
    });

    it('should return failure on other fs.access errors', async () => {
      mockAccess.mockRejectedValueOnce(new Error('Permission Denied'));
      const result = await getMatchSuggestionLogRawContent();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Could not read match suggestion log file.');
    });

    it('should return failure on other fs.readFile errors', async () => {
      mockAccess.mockResolvedValueOnce(undefined); // access succeeds
      mockReadFile.mockRejectedValueOnce(new Error('Read Error'));
      const result = await getMatchSuggestionLogRawContent();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Could not read match suggestion log file.');
    });
  });
});
