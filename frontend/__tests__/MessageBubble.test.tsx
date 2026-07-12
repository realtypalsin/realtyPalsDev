import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MessageBubble from '@/components/chat/MessageBubble';
import type { ChatMessage } from '@/types/property';

// Mock dependencies
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: (props: any) => <div data-testid="react-markdown">{props.children}</div>,
}));

jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/components/ProjectCard', () => ({
  __esModule: true,
  default: () => <div data-testid="project-card">ProjectCard</div>,
}));

jest.mock('@/components/chat/PropertyCardWithRecommendation', () => ({
  __esModule: true,
  default: () => <div data-testid="property-card-with-rec">PropertyCardWithRecommendation</div>,
}));

jest.mock('@/components/response/ResponseBlockRenderer', () => ({
  ResponseBlockRenderer: ({ blocks }: any) => (
    <div data-testid="response-block-renderer">{blocks.length} blocks rendered</div>
  ),
}));

jest.mock('@/components/ChatLoader', () => ({
  __esModule: true,
  default: () => <div data-testid="chat-loader">Loading...</div>,
}));

jest.mock('@/lib/analytics', () => ({
  track: jest.fn(),
}));

const mockUserMessage: ChatMessage = {
  id: 'msg-1',
  role: 'user',
  content: 'Show me projects in Sector 150',
  timestamp: Date.now(),
};

const mockAssistantMessage: ChatMessage = {
  id: 'msg-2',
  role: 'assistant',
  content: 'Here are some top projects in Sector 150.',
  timestamp: Date.now(),
  isStreaming: false,
};

describe('MessageBubble Component', () => {
  it('renders user message correctly', () => {
    render(
      <MessageBubble
        message={mockUserMessage}
        index={0}
        isLast={true}
        isSubmitting={false}
        chatPhase="DISCOVERY"
        isLastProperties={false}
        isExpanded={false}
        carouselIndex={0}
        lastShortlist={[]}
        showMap={false}
        userId={null}
        regeneratingIdx={null}
        chipPicker={null}
        chips={[]}
        onCopy={jest.fn()}
        onDetailOpen={jest.fn()}
        onCallback={jest.fn()}
        onRegenerate={jest.fn()}
        onAction={jest.fn()}
        onToggleExpanded={jest.fn()}
        onToggleMap={jest.fn()}
        setCarouselIndex={jest.fn()}
      />
    );
    
    expect(screen.getByText('Show me projects in Sector 150')).toBeInTheDocument();
  });

  it('renders assistant message correctly', () => {
    render(
      <MessageBubble
        message={mockAssistantMessage}
        index={1}
        isLast={true}
        isSubmitting={false}
        chatPhase="DISCOVERY"
        isLastProperties={false}
        isExpanded={false}
        carouselIndex={0}
        lastShortlist={[]}
        showMap={false}
        userId={null}
        regeneratingIdx={null}
        chipPicker={null}
        chips={[]}
        onCopy={jest.fn()}
        onDetailOpen={jest.fn()}
        onCallback={jest.fn()}
        onRegenerate={jest.fn()}
        onAction={jest.fn()}
        onToggleExpanded={jest.fn()}
        onToggleMap={jest.fn()}
        setCarouselIndex={jest.fn()}
      />
    );
    
    expect(screen.getByText('Here are some top projects in Sector 150.')).toBeInTheDocument();
  });

  it('shows typing indicator when assistant is streaming with no content', () => {
    const streamingMessage: ChatMessage = {
      ...mockAssistantMessage,
      content: '',
      isStreaming: true,
    };

    render(
      <MessageBubble
        message={streamingMessage}
        index={1}
        isLast={true}
        isSubmitting={true}
        chatPhase="DISCOVERY"
        isLastProperties={false}
        isExpanded={false}
        carouselIndex={0}
        lastShortlist={[]}
        showMap={false}
        userId={null}
        regeneratingIdx={null}
        chipPicker={null}
        chips={[]}
        onCopy={jest.fn()}
        onDetailOpen={jest.fn()}
        onCallback={jest.fn()}
        onRegenerate={jest.fn()}
        onAction={jest.fn()}
        onToggleExpanded={jest.fn()}
        onToggleMap={jest.fn()}
        setCarouselIndex={jest.fn()}
      />
    );

    // Look for inline loading UI "Understanding your request..."
    expect(screen.getByText('Understanding your request…')).toBeInTheDocument();
  });
});
