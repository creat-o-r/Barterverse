import { Timestamp } from 'firebase/firestore';

/**
 * Converts Firestore Timestamps in an object to ISO date strings.
 * If a field 'logistics.timing.date' is already a string, it's preserved.
 * @param data The object with potential Timestamp fields.
 * @returns A new object with Timestamps converted.
 */
export const processFirestoreTimestamps = (data: any): any => {
  if (!data) return data;
  const processedData = { ...data };
  for (const key in processedData) {
    if (processedData[key] instanceof Timestamp) {
      processedData[key] = processedData[key].toDate().toISOString();
    } else if (key === 'logistics' && processedData[key]?.timing?.date && typeof processedData[key].timing.date === 'string') {
      // This specific case for 'logistics.timing.date' string is already handled by not being a Timestamp instance.
      // No special action needed here if it's intended to remain a string.
      // If it needed conversion *to* Timestamp or Date, that would be different.
    } else if (typeof processedData[key] === 'object' && processedData[key] !== null) {
      // Recursively process nested objects, but not arrays for now to keep it simple.
      // Firestore Timestamps are not typically nested deeply within arbitrary objects without being top-level fields of sub-objects.
      // This recursive step might be overly broad or unnecessary if Timestamps are always direct properties.
      // For now, let's comment it out to avoid unintended side effects unless a clear need for deep processing is shown.
      // processedData[key] = processFirestoreTimestamps(processedData[key]);
    }
  }
  return processedData;
};
