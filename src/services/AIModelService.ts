// AI Model Service implementation for local LLM integration

import { AIModelService, AIModelConfig, AIModelResponse, CardGenerationPrompt } from '../interfaces/ai';
import { FlashCard, CardType, DifficultyLevel } from '../types/flashcard';
import { Keyword, ContentChunk } from '../types/content';
import { v4 as uuidv4 } from 'uuid';

export class LocalAIModelService implements AIModelService {
  private config: AIModelConfig;

  constructor(config?: Partial<AIModelConfig>) {
    this.config = {
      provider: 'ollama',
      baseUrl: 'http://localhost:11434',
      model: 'llama3.2:3b',
      timeout: 30000,
      maxRetries: 3,
      ...config
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.models && data.models.some((model: any) => 
        model.name.includes(this.config.model.split(':')[0])
      );
    } catch (error) {
      console.warn('AI model availability check failed:', error);
      return false;
    }
  }

  async generateCards(keywords: Keyword[], context: ContentChunk[]): Promise<FlashCard[]> {
    if (keywords.length === 0) {
      throw new AIError('No keywords provided for card generation', 'generation_failed', false);
    }

    const prompt = this.buildCardGenerationPrompt({ 
      keywords, 
      context, 
      cardTypes: ['definition', 'question_answer'],
      maxCards: Math.min(keywords.length * 2, 10),
      difficulty: 'medium'
    });

    try {
      const response = await this.callModel(prompt);
      return this.parseCardsFromResponse(response.content, keywords, context);
    } catch (error) {
      if (error instanceof AIError) {
        throw error;
      }
      throw new AIError(
        `Card generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'generation_failed',
        true
      );
    }
  }

  validateResponse(response: string): boolean {
    if (!response || response.trim().length === 0) {
      return false;
    }

    // Check for basic JSON structure or card markers
    return response.includes('CARD:') || 
           response.includes('{') || 
           (response.includes('Q:') && response.includes('A:'));
  }

  getConfig(): AIModelConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<AIModelConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private buildCardGenerationPrompt(prompt: CardGenerationPrompt): string {
    // Basic prompt generation - prompt engineering integration can be added later
    const keywordList = prompt.keywords.map(k => `- ${k.term} (${k.category})`).join('\n');
    const contextText = prompt.context.map(c => c.text).join('\n\n');

    return `You are an expert educational content creator. Generate flashcards from the following content.

KEYWORDS TO FOCUS ON:
${keywordList}

CONTEXT:
${contextText}

INSTRUCTIONS:
- Create ${prompt.maxCards} flashcards maximum
- Focus on the most important keywords
- Use clear, concise language
- Make questions specific and answerable
- Vary question types (definitions, explanations, applications)

FORMAT YOUR RESPONSE AS:
CARD: 1
Q: [Question here]
A: [Answer here]
TYPE: definition

CARD: 2
Q: [Question here]
A: [Answer here]
TYPE: question_answer

Continue this pattern for each card.`;
  }

  private async callModel(prompt: string): Promise<AIModelResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.config.baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.config.model,
            prompt: prompt,
            stream: false,
            options: {
              temperature: 0.7,
              top_p: 0.9,
              max_tokens: 2000
            }
          }),
          signal: AbortSignal.timeout(this.config.timeout)
        });

        if (!response.ok) {
          throw new AIError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status === 404 ? 'model_unavailable' : 'connection_failed',
            response.status >= 500
          );
        }

        const data = await response.json();
        
        if (!data.response) {
          throw new AIError('Empty response from model', 'invalid_response', true);
        }

        return {
          content: data.response,
          model: this.config.model,
          finishReason: data.done ? 'stop' : 'length'
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (error instanceof AIError && !error.retryable) {
          throw error;
        }

        if (attempt === this.config.maxRetries) {
          break;
        }

        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw new AIError(
      `Failed after ${this.config.maxRetries} attempts: ${lastError?.message}`,
      'connection_failed',
      false
    );
  }

  private parseCardsFromResponse(response: string, keywords: Keyword[], context: ContentChunk[]): FlashCard[] {
    const cards: FlashCard[] = [];
    const cardBlocks = response.split(/CARD:\s*\d+/).slice(1);

    for (const block of cardBlocks) {
      try {
        const card = this.parseCardBlock(block, keywords, context);
        if (card) {
          cards.push(card);
        }
      } catch (error) {
        console.warn('Failed to parse card block:', error);
        continue;
      }
    }

    // Fallback parsing if structured format fails
    if (cards.length === 0) {
      return this.fallbackCardParsing(response, keywords, context);
    }

    return cards;
  }

  private parseCardBlock(block: string, keywords: Keyword[], context: ContentChunk[]): FlashCard | null {
    const qMatch = block.match(/Q:\s*(.+?)(?=\nA:)/s);
    const aMatch = block.match(/A:\s*(.+?)(?=\nTYPE:|$)/s);
    const typeMatch = block.match(/TYPE:\s*(\w+)/);

    if (!qMatch || !aMatch) {
      return null;
    }

    const front = qMatch[1].trim();
    const back = aMatch[1].trim();
    const typeStr = typeMatch?.[1] || 'question_answer';

    // Map type string to CardType enum
    let cardType: CardType;
    switch (typeStr.toLowerCase()) {
      case 'definition':
        cardType = CardType.DEFINITION;
        break;
      case 'fill_blank':
        cardType = CardType.FILL_BLANK;
        break;
      case 'true_false':
        cardType = CardType.TRUE_FALSE;
        break;
      default:
        cardType = CardType.QUESTION_ANSWER;
    }

    // Find relevant keywords for this card
    const cardKeywords = keywords
      .filter(k => front.toLowerCase().includes(k.term.toLowerCase()) || 
                   back.toLowerCase().includes(k.term.toLowerCase()))
      .map(k => k.term);

    return {
      id: uuidv4(),
      front,
      back,
      type: cardType,
      difficulty: DifficultyLevel.MEDIUM,
      keywords: cardKeywords,
      sourceContext: context.map(c => c.text).join(' ').substring(0, 200),
      createdAt: new Date()
    };
  }

  private fallbackCardParsing(response: string, keywords: Keyword[], context: ContentChunk[]): FlashCard[] {
    const cards: FlashCard[] = [];
    
    // Try to extract Q: A: patterns
    const qaMatches = response.matchAll(/Q:\s*(.+?)\s*A:\s*(.+?)(?=\n|$)/gs);
    
    for (const match of qaMatches) {
      const front = match[1].trim();
      const back = match[2].trim();
      
      if (front && back) {
        const cardKeywords = keywords
          .filter(k => front.toLowerCase().includes(k.term.toLowerCase()) || 
                       back.toLowerCase().includes(k.term.toLowerCase()))
          .map(k => k.term);

        cards.push({
          id: uuidv4(),
          front,
          back,
          type: CardType.QUESTION_ANSWER,
          difficulty: DifficultyLevel.MEDIUM,
          keywords: cardKeywords,
          sourceContext: context.map(c => c.text).join(' ').substring(0, 200),
          createdAt: new Date()
        });
      }
    }

    return cards;
  }
}

// Custom error class for AI-related errors
class AIError extends Error implements AIError {
  constructor(
    message: string,
    public type: 'connection_failed' | 'model_unavailable' | 'generation_failed' | 'timeout' | 'invalid_response',
    public retryable: boolean,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AIError';
  }
}