import React from 'react';

// Helper to create a generic mock icon component
const createMockIcon = (displayName: string) => {
  const MockIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg data-testid={`${displayName.toLowerCase()}-icon`} {...props} />
  );
  MockIcon.displayName = displayName;
  return MockIcon;
};

export const Facebook = createMockIcon('Facebook');
export const Twitter = createMockIcon('Twitter');
export const MessageCircle = createMockIcon('MessageCircle');
export const Linkedin = createMockIcon('Linkedin');
export const Pinterest = createMockIcon('Pinterest');
export const Reddit = createMockIcon('Reddit');
export const Send = createMockIcon('Send');
export const Mail = createMockIcon('Mail');
export const ChevronDown = createMockIcon('ChevronDown');
export const ChevronUp = createMockIcon('ChevronUp');
export const Smartphone = createMockIcon('Smartphone');
export const Copy = createMockIcon('Copy');
export const CheckCircle2 = createMockIcon('CheckCircle2');


// If you use other icons from lucide-react in other components being tested,
// you might need to add them here or use a more generic solution like:
// const actualLucide = jest.requireActual('lucide-react');
// module.exports = { ...actualLucide, /* your mocks here */ };
// However, for this specific component, mocking only the used icons is fine.
