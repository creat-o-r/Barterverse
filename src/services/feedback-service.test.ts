import {
  FeedbackReport,
  logFeedbackEntry,
  getFeedbackLogContent,
  clearFeedbackLog,
} from './feedback-service'; // Adjust path as necessary
import fs from 'fs/promises';
import path from 'path';
import type { AIModelName } from './ai-config-service'; // For FeedbackReport.modelUsedContext

// Mock fs/promises
jest.mock('fs/promises');
const mockReadFile = fs.readFile as jest.Mock;
const mockWriteFile = fs.writeFile as jest.Mock;
const mockAccess = fs.access as jest.Mock;

// Use the same log file path logic as in the service
const TEST_FEEDBACK_LOG_FILE_PATH = path.join(process.cwd(), '.feedback-reports.log.json');

// Hold original console.error and restore it
let originalConsoleError: typeof console.error;
let originalConsoleLog: typeof console.log; // For verbose logging in service

beforeEach(() => {
  mockReadFile.mockReset();
  mockWriteFile.mockReset();
  mockAccess.mockReset();

  // Default behavior: fs operations succeed, file exists
  mockAccess.mockResolvedValue(undefined);
  mockWriteFile.mockResolvedValue(undefined);
  mockReadFile.mockResolvedValue(JSON.stringify([])); // Default to empty log array

  // Mock console
  originalConsoleError = console.error;
  console.error = jest.fn();
  originalConsoleLog = console.log; // Service logs successful operations too
  console.log = jest.fn();
});

afterEach(() => {
  // Restore console
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});

describe('Feedback Service', () => {

  const sampleFeedbackData: Omit<FeedbackReport, 'timestamp'> = {
    feedbackType: 'match-score',
    reportedValue: '5',
    mainItemId: 'item1',
    suggestedItemId: 'item2',
    reportingUserId: 'user123',
    modelUsedContext: 'gemini-1.5-pro-latest',
  };

  // --- Tests for internal readFeedbackLogs (implicitly via exported functions) ---
  describe('readFeedbackLogs behavior', () => {
    it('should return an empty array if file does not exist (ENOENT) and create the file', async () => {
      mockAccess.mockRejectedValueOnce({ code: 'ENOENT' });
      // `logFeedbackEntry` calls `readFeedbackLogs` first.
      // We expect `writeFile` to be called to create the empty log file.
      await logFeedbackEntry(sampleFeedbackData);
      expect(mockWriteFile).toHaveBeenCalledWith(TEST_FEEDBACK_LOG_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
      // The second writeFile is for the actual new log entry
      expect(mockWriteFile).toHaveBeenCalledTimes(2);
    });

    it('should return empty array and log error if creating file fails on ENOENT', async () => {
        mockAccess.mockRejectedValueOnce({ code: 'ENOENT' });
        mockWriteFile.mockImplementationOnce(() => Promise.reject(new Error('Create failed'))); // First write (create) fails

        // logFeedbackEntry calls readFeedbackLogs, which tries to create the file.
        // If creation fails, readFeedbackLogs should return [] and log an error.
        // Then logFeedbackEntry will try to write the new log, which might also fail or succeed
        // depending on if we mock the second writeFile. For this test, we care about the create failure.
        await logFeedbackEntry(sampleFeedbackData);

        expect(console.error).toHaveBeenCalledWith('[Feedback Service] Error creating feedback log file:', expect.any(Error));
        // readFeedbackLogs returns [], then logFeedbackEntry adds one item and tries to write.
        // The first call to writeFile was the failed attempt to create.
        // The second call is to write the new log array.
        expect(mockWriteFile.mock.calls[1][0]).toBe(TEST_FEEDBACK_LOG_FILE_PATH);
        const writtenData = JSON.parse(mockWriteFile.mock.calls[1][1]);
        expect(writtenData).toHaveLength(1);
    });

    it('should return an empty array if file is empty', async () => {
      mockReadFile.mockResolvedValueOnce('');
      // `logFeedbackEntry` calls `readFeedbackLogs`.
      // If file is empty, `readFeedbackLogs` returns `[]`.
      // Then `logFeedbackEntry` adds the new entry and calls `writeFeedbackLogs`.
      await logFeedbackEntry(sampleFeedbackData);
      const writtenData = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(writtenData).toHaveLength(1);
      expect(writtenData[0].feedbackType).toBe(sampleFeedbackData.feedbackType);
    });

    it('should return an empty array and log error if file contains invalid JSON', async () => {
      mockReadFile.mockResolvedValueOnce('invalid json');
      await logFeedbackEntry(sampleFeedbackData); // Calls read, which fails parsing
      expect(console.error).toHaveBeenCalledWith('[Feedback Service] Error reading feedback log file:', expect.any(SyntaxError));
      // readFeedbackLogs returns [], then logFeedbackEntry adds one item and tries to write.
      const writtenData = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(writtenData).toHaveLength(1);
    });

    it('should return an empty array and log error if fs.access throws an unexpected error (not ENOENT)', async () => {
      mockAccess.mockRejectedValueOnce(new Error('Permission denied'));
      await logFeedbackEntry(sampleFeedbackData);
      expect(console.error).toHaveBeenCalledWith('[Feedback Service] Error reading feedback log file:', expect.any(Error));
      const writtenData = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(writtenData).toHaveLength(1); // Still proceeds with an empty array
    });

    it('should correctly parse and use existing valid JSON content', async () => {
        const existingEntry: FeedbackReport = { ...sampleFeedbackData, timestamp: new Date().toISOString(), mainItemId: 'existingItem' };
        mockReadFile.mockResolvedValueOnce(JSON.stringify([existingEntry]));
        await logFeedbackEntry(sampleFeedbackData);
        const writtenData = JSON.parse(mockWriteFile.mock.calls[0][1]);
        expect(writtenData).toHaveLength(2);
        expect(writtenData[1].mainItemId).toBe('existingItem'); // Newest is [0]
    });
  });

  // --- Tests for internal writeFeedbackLogs (implicitly via exported functions) ---
  describe('writeFeedbackLogs behavior', () => {
    it('should be called with correctly stringified logs by logFeedbackEntry', async () => {
        mockReadFile.mockResolvedValueOnce(JSON.stringify([])); // Start with empty logs
        await logFeedbackEntry(sampleFeedbackData);
        expect(mockWriteFile).toHaveBeenCalledTimes(1);
        const writtenArg = mockWriteFile.mock.calls[0][1];
        const writtenData = JSON.parse(writtenArg);
        expect(writtenData).toHaveLength(1);
        expect(writtenData[0].feedbackType).toBe(sampleFeedbackData.feedbackType);
        expect(writtenData[0].timestamp).toBeDefined();
    });

    it('should result in logFeedbackEntry returning success:false if writeFeedbackLogs internally returns false due to fs.writeFile failure', async () => {
        mockReadFile.mockResolvedValueOnce(JSON.stringify([])); // readFeedbackLogs will succeed and return []

        // Ensure fs.writeFile (which writeFeedbackLogs calls) is the one that fails
        mockWriteFile.mockImplementationOnce(() => {
          // console.log('mockWriteFile forced rejection is executing'); // For debugging
          return Promise.reject(new Error("Disk full"));
        });

        const result = await logFeedbackEntry(sampleFeedbackData);

        expect(mockWriteFile).toHaveBeenCalledTimes(1); // Verify it was called
        expect(result.success).toBe(false);
        expect(result.message).toBe('Failed to write feedback to log file.');
        expect(console.error).toHaveBeenCalledWith('[Feedback Service] Error writing feedback log file:', expect.any(Error));
    });
  });

  // --- Tests for logFeedbackEntry ---
  describe('logFeedbackEntry', () => {
    it('should successfully log an entry when starting with an empty log file', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify([])); // readFeedbackLogs returns []
      mockWriteFile.mockResolvedValueOnce(undefined); // writeFeedbackLogs succeeds

      const result = await logFeedbackEntry(sampleFeedbackData);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Feedback logged successfully.');
      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      const writtenData = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(writtenData).toHaveLength(1);
      expect(writtenData[0].mainItemId).toBe(sampleFeedbackData.mainItemId);
    });

    it('should prepend new entry to existing logs', async () => {
      const existingEntry: FeedbackReport = {
        timestamp: new Date(Date.now() - 100000).toISOString(), // Older entry
        feedbackType: 'match-reasoning',
        reportedValue: 'good reason',
        mainItemId: 'itemX',
        suggestedItemId: 'itemY',
      };
      mockReadFile.mockResolvedValueOnce(JSON.stringify([existingEntry]));
      mockWriteFile.mockResolvedValueOnce(undefined);

      const result = await logFeedbackEntry(sampleFeedbackData);
      expect(result.success).toBe(true);
      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      const writtenData = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(writtenData).toHaveLength(2);
      expect(writtenData[0].mainItemId).toBe(sampleFeedbackData.mainItemId); // Newest first
      expect(writtenData[1].mainItemId).toBe(existingEntry.mainItemId);
    });

    it('should return success:false if writeFeedbackLogs (fs.writeFile) fails', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify([]));
      mockWriteFile.mockRejectedValueOnce(new Error('Disk full'));

      const result = await logFeedbackEntry(sampleFeedbackData);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to write feedback to log file.');
    });
  });

  // --- Tests for getFeedbackLogContent ---
  describe('getFeedbackLogContent', () => {
    it('should return content if log file exists and is valid JSON', async () => {
      const feedbackArray = [sampleFeedbackData];
      const fileContent = JSON.stringify(feedbackArray);
      mockReadFile.mockResolvedValueOnce(fileContent);

      const result = await getFeedbackLogContent();
      expect(mockAccess).toHaveBeenCalledWith(TEST_FEEDBACK_LOG_FILE_PATH);
      expect(mockReadFile).toHaveBeenCalledWith(TEST_FEEDBACK_LOG_FILE_PATH, 'utf-8');
      expect(result).toEqual({ success: true, content: fileContent });
    });

    it('should return "[]" if log file exists and is empty or whitespace', async () => {
      mockReadFile.mockResolvedValueOnce('   ');
      const result = await getFeedbackLogContent();
      expect(result).toEqual({ success: true, content: "[]" });
    });

    it('should return "[]" if log file does not exist (ENOENT)', async () => {
      mockAccess.mockRejectedValueOnce({ code: 'ENOENT' });
      const result = await getFeedbackLogContent();
      expect(mockReadFile).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, content: "[]" });
    });

    it('should return failure if log file is invalid JSON', async () => {
      mockReadFile.mockResolvedValueOnce('invalid json');
      const result = await getFeedbackLogContent();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Feedback log file is not valid JSON');
      expect(console.error).toHaveBeenCalledWith('[Feedback Service] Error reading feedback log content:', expect.any(SyntaxError));
    });

    it('should return failure on other fs.access errors', async () => {
      mockAccess.mockRejectedValueOnce(new Error('Permission denied'));
      const result = await getFeedbackLogContent();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Could not read feedback log file.');
      expect(console.error).toHaveBeenCalledWith('[Feedback Service] Error reading feedback log content:', expect.any(Error));
    });

    it('should return failure on other fs.readFile errors (after access succeeds)', async () => {
      mockAccess.mockResolvedValueOnce(undefined); // Access succeeds
      mockReadFile.mockRejectedValueOnce(new Error('IO Read Error'));
      const result = await getFeedbackLogContent();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Could not read feedback log file.');
      expect(console.error).toHaveBeenCalledWith('[Feedback Service] Error reading feedback log content:', expect.any(Error));
    });
  });

  // --- Tests for clearFeedbackLog ---
  describe('clearFeedbackLog', () => {
    it('should successfully write an empty array to the log file', async () => {
      mockWriteFile.mockResolvedValueOnce(undefined);
      const result = await clearFeedbackLog();
      expect(result.success).toBe(true);
      expect(result.message).toBe('Feedback log cleared successfully.');
      expect(mockWriteFile).toHaveBeenCalledWith(
        TEST_FEEDBACK_LOG_FILE_PATH,
        JSON.stringify([], null, 2),
        'utf-8'
      );
    });

    it('should return success:false if fs.writeFile fails', async () => {
      mockWriteFile.mockRejectedValueOnce(new Error('Disk full'));
      const result = await clearFeedbackLog();
      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to clear feedback log file.');
      expect(console.error).toHaveBeenCalledWith('[Feedback Service] Error clearing feedback log file:', expect.any(Error));
    });
  });
});
