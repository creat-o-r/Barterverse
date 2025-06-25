import { dummyItems, dummyUsers } from './dummy-data';

describe('Dummy Data', () => {
  it('should have valid dummy items data structure', () => {
    expect(Array.isArray(dummyItems)).toBe(true);
    expect(dummyItems.length).toBeGreaterThan(0);
    expect(dummyItems[0]).toHaveProperty('id');
    expect(dummyItems[0]).toHaveProperty('name');
    expect(dummyItems[0]).toHaveProperty('listingType');
  });

  it('should have valid dummy users data structure', () => {
    expect(Array.isArray(dummyUsers)).toBe(true);
    expect(dummyUsers.length).toBeGreaterThan(0);
    expect(dummyUsers[0]).toHaveProperty('id');
    expect(dummyUsers[0]).toHaveProperty('name');
  });

  it('should contain items with different listing types', () => {
    const listingTypes = dummyItems.map(item => item.listingType);
    expect(listingTypes).toContain('offer');
    expect(listingTypes).toContain('want');
  });

  it('should have items with various categories', () => {
    const categories = dummyItems.map(item => item.category);
    const uniqueCategories = [...new Set(categories)];
    expect(uniqueCategories.length).toBeGreaterThan(1);
  });

  it('should have users data structure with all required fields', () => {
    const user = dummyUsers[0];
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('rating');
    expect(user).toHaveProperty('bio');
  });
});