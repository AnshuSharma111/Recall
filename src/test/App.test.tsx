import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App', () => {
  it('renders the main heading', () => {
    render(<App />);
    expect(screen.getByText('Recall')).toBeInTheDocument();
  });

  it('displays the application description', () => {
    render(<App />);
    expect(screen.getByText('AI-powered local flashcard generation with spaced repetition')).toBeInTheDocument();
  });

  it('shows foundation ready message', () => {
    render(<App />);
    expect(screen.getByText('Application foundation is ready. Core interfaces defined.')).toBeInTheDocument();
  });
});