import {
  AIMatchingMode,
  AIModelName,
  getAIMatchingMode,
  setAIMatchingMode,
  getUseUserProfilePreferencesInMatching,
  setUseUserProfilePreferencesInMatching,
  getEnableAutomaticPreferenceInference,
  setEnableAutomaticPreferenceInference,
  getPreferredAIModel,
  setPreferredAIModel,
} from './ai-config-service'; // Adjust path as necessary
import fs from 'fs/promises';
import path from 'path';

// Define AISettings interface locally since it's not exported from the module
interface AISettings {
  matchingMode: AIMatchingMode;
  useUserProfilePreferencesInMatching: boolean;
  enableAutomaticPreferenceInference: boolean;
  preferredModel: AIModelName;
}

// Mock fs/promises
jest.mock('fs/promises');
const mockReadFile = fs.readFile as jest.Mock;
const mockWriteFile = fs.writeFile as jest.Mock;
const mockAccess = fs.access as jest.Mock;

// Test Constants (mirroring internal constants of the service)
const TEST_SETTINGS_FILE_PATH = path.join(process.cwd(), '.ai-settings.json');

const defaultTestSettings: AISettings = {
  matchingMode: 'advanced',
  useUserProfilePreferencesInMatching: true,
  enableAutomaticPreferenceInference: false,
  preferredModel: 'gemini-1.5-pro-latest',
};

const validTestModels: AIModelName[] = ['gemini-1.5-pro-latest', 'gemini-1.0-pro', 'gemini-2.5-pro-preview-05-06'];

// Helper to reset mocks before each test
beforeEach(() => {
  mockReadFile.mockReset();
  mockWriteFile.mockReset();
  mockAccess.mockReset();
  // Default behavior: file exists, writeFile succeeds
  mockAccess.mockResolvedValue(undefined);
  mockWriteFile.mockResolvedValue(undefined);
});

describe('AI Config Service', () => {

  // --- Tests for internal readSettings (via exported functions) ---
  describe('readSettings behavior (tested via getters)', () => {
    it('should return default settings if file does not exist (ENOENT), and create the file', async () => {
      mockAccess.mockRejectedValueOnce({ code: 'ENOENT' });

      const model = await getPreferredAIModel(); // Call any getter to trigger readSettings
      expect(model).toBe(defaultTestSettings.preferredModel);
      expect(mockWriteFile).toHaveBeenCalledWith(
        TEST_SETTINGS_FILE_PATH,
        JSON.stringify(defaultTestSettings, null, 2),
        'utf-8'
      );
      // Ensure it's default settings for all getters
      expect(await getAIMatchingMode()).toBe(defaultTestSettings.matchingMode);
    });

    it('should return default settings and create file if settings file is empty', async () => {
      mockReadFile.mockResolvedValueOnce('');

      const model = await getPreferredAIModel();
      expect(model).toBe(defaultTestSettings.preferredModel);
      expect(mockWriteFile).toHaveBeenCalledWith(
        TEST_SETTINGS_FILE_PATH,
        JSON.stringify(defaultTestSettings, null, 2),
        'utf-8'
      );
    });

    it('should return default settings and create file if settings file is invalid JSON', async () => {
      mockReadFile.mockResolvedValueOnce('invalid json');

      const model = await getPreferredAIModel();
      expect(model).toBe(defaultTestSettings.preferredModel);
      expect(mockWriteFile).toHaveBeenCalledWith(
        TEST_SETTINGS_FILE_PATH,
        JSON.stringify(defaultTestSettings, null, 2),
        'utf-8'
      );
    });

    it('should return default settings if fs.access throws an unexpected error', async () => {
        mockAccess.mockRejectedValueOnce(new Error('Unexpected FS error'));

        const model = await getPreferredAIModel();
        expect(model).toBe(defaultTestSettings.preferredModel);
        // writeFile might not be called if access throws non-ENOENT error before read attempt
        // The current implementation of readSettings returns default without writing if access fails unexpectedly
        expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it('should return merged settings if file has partial valid settings', async () => {
      const partialSettings = { matchingMode: 'simple' as AIMatchingMode };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(partialSettings));

      const mode = await getAIMatchingMode();
      expect(mode).toBe('simple');
      const useProfile = await getUseUserProfilePreferencesInMatching();
      // Should fall back to default for unspecified settings
      expect(useProfile).toBe(defaultTestSettings.useUserProfilePreferencesInMatching);
      const preferredModel = await getPreferredAIModel();
      expect(preferredModel).toBe(defaultTestSettings.preferredModel);
    });

    it('should use default preferredModel if file has invalid preferredModel', async () => {
      const invalidModelSettings = { preferredModel: 'invalid-model-name' as AIModelName };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(invalidModelSettings));

      const model = await getPreferredAIModel();
      expect(model).toBe(defaultTestSettings.preferredModel);
    });

    it('should return valid settings from file if file is valid and complete', async () => {
      const validCompleteSettings: AISettings = {
        matchingMode: 'simple',
        useUserProfilePreferencesInMatching: false,
        enableAutomaticPreferenceInference: true,
        preferredModel: 'gemini-1.0-pro',
      };
      // Use mockResolvedValue so all calls to readSettings within this test get this value
      mockReadFile.mockResolvedValue(JSON.stringify(validCompleteSettings));

      expect(await getAIMatchingMode()).toBe(validCompleteSettings.matchingMode);
      expect(await getUseUserProfilePreferencesInMatching()).toBe(validCompleteSettings.useUserProfilePreferencesInMatching);
      expect(await getEnableAutomaticPreferenceInference()).toBe(validCompleteSettings.enableAutomaticPreferenceInference);
      expect(await getPreferredAIModel()).toBe(validCompleteSettings.preferredModel);
    });
  });

  // --- Tests for internal writeSettings (via exported functions) ---
  describe('writeSettings behavior (tested via setters)', () => {
    it('should call fs.writeFile with correct parameters on successful set', async () => {
      const newMode: AIMatchingMode = 'simple';
      // readSettings will be called first, make it return default
      mockReadFile.mockResolvedValueOnce(JSON.stringify(defaultTestSettings));

      await setAIMatchingMode(newMode);

      const expectedSettingsToWrite = { ...defaultTestSettings, matchingMode: newMode };
      expect(mockWriteFile).toHaveBeenCalledWith(
        TEST_SETTINGS_FILE_PATH,
        JSON.stringify(expectedSettingsToWrite, null, 2),
        'utf-8'
      );
    });

    it('should return {success: false} if writeFile fails during set', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify(defaultTestSettings));
      mockWriteFile.mockRejectedValueOnce(new Error('Disk full'));

      const result = await setAIMatchingMode('simple');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to save');
    });

    it('should revert to default preferredModel if attempting to write an invalid one', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify(defaultTestSettings));
      // Attempt to set a valid property (matchingMode) but also ensure preferredModel is part of settings
      // The actual setPreferredAIModel function has specific guards, this tests writeSettings directly.
      // To test writeSettings's guard, we need a setter that constructs a settings object
      // with an invalid model and passes it to writeSettings.
      // Let's use setAIMatchingMode and assume it passes the whole currentSettings to writeSettings.
      // We need to make readSettings return settings with an invalid model first.

      const settingsWithInvalidModel = { ...defaultTestSettings, preferredModel: 'invalid-model' as AIModelName };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(settingsWithInvalidModel));

      // Now, when setAIMatchingMode calls writeSettings, writeSettings should correct the model
      await setAIMatchingMode('simple');

      const writtenData = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(writtenData.preferredModel).toBe(defaultTestSettings.preferredModel);
      expect(writtenData.matchingMode).toBe('simple');
    });
  });

  // --- Tests for Getter Functions ---
  describe('Getter Functions', () => {
    // getAIMatchingMode
    it('getAIMatchingMode should return correct value from settings', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify({ ...defaultTestSettings, matchingMode: 'simple' }));
      expect(await getAIMatchingMode()).toBe('simple');
    });
    it('getAIMatchingMode should return default on read error', async () => {
      mockReadFile.mockRejectedValueOnce(new Error('Read failed'));
      // The main readSettings catches generic errors and returns defaults.
      // The getter itself has another catch but it's for "FATAL" errors,
      // which are less likely if readSettings already defaults.
      expect(await getAIMatchingMode()).toBe(defaultTestSettings.matchingMode);
    });

    // getUseUserProfilePreferencesInMatching
    it('getUseUserProfilePreferencesInMatching should return correct value', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify({ ...defaultTestSettings, useUserProfilePreferencesInMatching: false }));
      expect(await getUseUserProfilePreferencesInMatching()).toBe(false);
    });
    it('getUseUserProfilePreferencesInMatching should return default on read error', async () => {
      mockReadFile.mockRejectedValueOnce(new Error('Read failed'));
      expect(await getUseUserProfilePreferencesInMatching()).toBe(defaultTestSettings.useUserProfilePreferencesInMatching);
    });

    // getEnableAutomaticPreferenceInference
    it('getEnableAutomaticPreferenceInference should return correct value', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify({ ...defaultTestSettings, enableAutomaticPreferenceInference: true }));
      expect(await getEnableAutomaticPreferenceInference()).toBe(true);
    });
     it('getEnableAutomaticPreferenceInference should return default on read error', async () => {
      mockReadFile.mockRejectedValueOnce(new Error('Read failed'));
      expect(await getEnableAutomaticPreferenceInference()).toBe(defaultTestSettings.enableAutomaticPreferenceInference);
    });

    // getPreferredAIModel
    it('getPreferredAIModel should return correct value', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify({ ...defaultTestSettings, preferredModel: 'gemini-1.0-pro' }));
      expect(await getPreferredAIModel()).toBe('gemini-1.0-pro');
    });
    it('getPreferredAIModel should return default on read error', async () => {
      mockReadFile.mockRejectedValueOnce(new Error('Read failed'));
      expect(await getPreferredAIModel()).toBe(defaultTestSettings.preferredModel);
    });
  });

  // --- Tests for Setter Functions ---
  describe('Setter Functions', () => {
    // setAIMatchingMode
    it('setAIMatchingMode should call writeSettings and return success', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify(defaultTestSettings));
      const result = await setAIMatchingMode('simple');
      expect(mockWriteFile).toHaveBeenCalledWith(
        TEST_SETTINGS_FILE_PATH,
        JSON.stringify({ ...defaultTestSettings, matchingMode: 'simple' }, null, 2),
        'utf-8'
      );
      expect(result.success).toBe(true);
    });
    it('setAIMatchingMode should return failure if writeSettings fails', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify(defaultTestSettings));
      mockWriteFile.mockRejectedValueOnce(new Error('Write failed'));
      const result = await setAIMatchingMode('simple');
      expect(result.success).toBe(false);
    });

    // setUseUserProfilePreferencesInMatching
    it('setUseUserProfilePreferencesInMatching should call writeSettings and return success', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify(defaultTestSettings));
      const result = await setUseUserProfilePreferencesInMatching(false);
      expect(mockWriteFile).toHaveBeenCalledWith(
        TEST_SETTINGS_FILE_PATH,
        JSON.stringify({ ...defaultTestSettings, useUserProfilePreferencesInMatching: false }, null, 2),
        'utf-8'
      );
      expect(result.success).toBe(true);
    });
     it('setUseUserProfilePreferencesInMatching should return failure if writeSettings fails', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify(defaultTestSettings));
      mockWriteFile.mockRejectedValueOnce(new Error('Write failed'));
      const result = await setUseUserProfilePreferencesInMatching(false);
      expect(result.success).toBe(false);
    });

    // setEnableAutomaticPreferenceInference
    it('setEnableAutomaticPreferenceInference should call writeSettings and return success', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify(defaultTestSettings));
      const result = await setEnableAutomaticPreferenceInference(true);
      expect(mockWriteFile).toHaveBeenCalledWith(
        TEST_SETTINGS_FILE_PATH,
        JSON.stringify({ ...defaultTestSettings, enableAutomaticPreferenceInference: true }, null, 2),
        'utf-8'
      );
      expect(result.success).toBe(true);
    });
    it('setEnableAutomaticPreferenceInference should return failure if writeSettings fails', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify(defaultTestSettings));
      mockWriteFile.mockRejectedValueOnce(new Error('Write failed'));
      const result = await setEnableAutomaticPreferenceInference(true);
      expect(result.success).toBe(false);
    });

    // setPreferredAIModel
    it('setPreferredAIModel should call writeSettings for valid model and return success', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify(defaultTestSettings));
      const result = await setPreferredAIModel('gemini-1.0-pro');
      expect(mockWriteFile).toHaveBeenCalledWith(
        TEST_SETTINGS_FILE_PATH,
        JSON.stringify({ ...defaultTestSettings, preferredModel: 'gemini-1.0-pro' }, null, 2),
        'utf-8'
      );
      expect(result.success).toBe(true);
    });
    it('setPreferredAIModel should return failure for invalid model and not call writeSettings', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify(defaultTestSettings)); // readSettings still called
      const result = await setPreferredAIModel('invalid-model' as AIModelName);
      expect(mockWriteFile).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.message).toContain('Attempt to set invalid model: invalid-model');
    });
     it('setPreferredAIModel should return failure if writeSettings fails for a valid model', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify(defaultTestSettings));
      mockWriteFile.mockRejectedValueOnce(new Error('Write failed'));
      const result = await setPreferredAIModel('gemini-1.0-pro');
      expect(result.success).toBe(false);
       expect(result.message).toContain('Failed to save preferred AI model');
    });
  });
});
