// Advanced Prompt Engineering for Flashcard Generation

import { CardType, DifficultyLevel } from '../types/flashcard';
import { Keyword, ContentChunk, KeywordCategory } from '../types/content';

export interface PromptTemplate {
  system: string;
  user: string;
  examples?: string[];
  constraints?: string[];
}

export interface PromptContext {
  keywords: Keyword[];
  chunks: ContentChunk[];
  cardType?: CardType;
  difficulty?: DifficultyLevel;
  maxCards?: number;
  subject?: string;
}

export class PromptEngineer {
  private templates: Map<CardType, PromptTemplate>;

  constructor() {
    this.templates = new Map();
    this.initializeTemplates();
  }

  /**
   * Generates an optimized prompt for card generation
   */
  public generatePrompt(context: PromptContext): string {
    const template = this.selectTemplate(context);
    const systemPrompt = this.buildSystemPrompt(template, context);
    const userPrompt = this.buildUserPrompt(template, context);
    
    return `${systemPrompt}\n\n${userPrompt}`;
  }

  /**
   * Generates prompts for specific card types
   */
  public generateTypedPrompt(cardType: CardType, context: PromptContext): string {
    // Template selection for typed prompts
    return this.generatePrompt({ ...context, cardType });
  }

  /**
   * Generates prompts optimized for different difficulty levels
   */
  public generateDifficultyPrompt(difficulty: DifficultyLevel, context: PromptContext): string {
    const basePrompt = this.generatePrompt(context);
    const difficultyInstructions = this.getDifficultyInstructions(difficulty);
    
    return `${basePrompt}\n\nDIFFICULTY LEVEL: ${difficultyInstructions}`;
  }

  /**
   * Generates subject-specific prompts
   */
  public generateSubjectPrompt(subject: string, context: PromptContext): string {
    const subjectInstructions = this.getSubjectInstructions(subject);
    const basePrompt = this.generatePrompt(context);
    
    return `${subjectInstructions}\n\n${basePrompt}`;
  }

  /**
   * Initializes prompt templates for different card types
   */
  private initializeTemplates(): void {
    this.templates.set(CardType.DEFINITION, {
      system: `You are an expert educational content creator specializing in creating clear, accurate definition flashcards. Your goal is to help students learn key concepts through precise definitions and explanations.`,
      user: `Create definition flashcards from the provided content. Focus on key terms and concepts that students need to understand.

GUIDELINES:
- Front: Ask "What is [term]?" or "Define [term]"
- Back: Provide clear, concise definitions with context
- Use simple, understandable language
- Include relevant examples when helpful
- Ensure accuracy and completeness`,
      examples: [
        `CARD: 1
Q: What is photosynthesis?
A: Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to produce glucose and oxygen. This process occurs in chloroplasts and is essential for plant energy production.
TYPE: definition`,
        `CARD: 2
Q: Define machine learning.
A: Machine learning is a method of data analysis that automates analytical model building. It uses algorithms that iteratively learn from data to identify patterns and make decisions with minimal human intervention.
TYPE: definition`
      ]
    });

    this.templates.set(CardType.QUESTION_ANSWER, {
      system: `You are an expert educator creating comprehensive question-answer flashcards. Focus on testing understanding, application, and critical thinking rather than just memorization.`,
      user: `Create question-answer flashcards that test comprehension and application of the concepts in the provided content.

GUIDELINES:
- Ask questions that require understanding, not just memorization
- Include "how," "why," and "what if" questions
- Test practical applications and implications
- Ensure questions are specific and answerable
- Vary question complexity appropriately`,
      examples: [
        `CARD: 1
Q: How does the process of photosynthesis benefit both plants and the environment?
A: Photosynthesis benefits plants by providing them with glucose for energy and growth. It benefits the environment by producing oxygen as a byproduct, which is essential for most life forms, and by removing carbon dioxide from the atmosphere.
TYPE: question_answer`,
        `CARD: 2
Q: Why is supervised learning particularly effective for prediction tasks?
A: Supervised learning is effective for prediction tasks because it learns from labeled training data, allowing the algorithm to understand the relationship between inputs and desired outputs. This enables it to make accurate predictions on new, unseen data.
TYPE: question_answer`
      ]
    });

    this.templates.set(CardType.FILL_BLANK, {
      system: `You are creating fill-in-the-blank flashcards that test specific knowledge and terminology. Focus on key terms, numbers, and critical concepts that students should memorize.`,
      user: `Create fill-in-the-blank flashcards from the provided content. Replace key terms with blanks to test specific knowledge.

GUIDELINES:
- Replace 1-3 key terms per card with ___
- Ensure the sentence remains grammatically correct
- Focus on important terminology and concepts
- Provide clear context for the missing term
- Include the complete answer`,
      examples: [
        `CARD: 1
Q: Photosynthesis occurs in the ___ of plant cells and requires ___, water, and carbon dioxide.
A: chloroplasts, sunlight
TYPE: fill_blank`,
        `CARD: 2
Q: ___ learning uses labeled training data to make predictions, while ___ learning finds patterns in data without labels.
A: Supervised, unsupervised
TYPE: fill_blank`
      ]
    });

    this.templates.set(CardType.TRUE_FALSE, {
      system: `You are creating true/false flashcards that test understanding of key concepts and common misconceptions. Focus on statements that clearly distinguish correct from incorrect information.`,
      user: `Create true/false flashcards based on the provided content. Include both true and false statements to test comprehensive understanding.

GUIDELINES:
- Create clear, unambiguous statements
- Test both correct facts and common misconceptions
- Avoid trick questions or overly complex statements
- Ensure statements can be definitively true or false
- Provide brief explanations for the answers`,
      examples: [
        `CARD: 1
Q: True or False: Photosynthesis only occurs during daylight hours.
A: True. Photosynthesis requires sunlight to provide the energy needed for the process, so it only occurs when light is available.
TYPE: true_false`,
        `CARD: 2
Q: True or False: Machine learning algorithms always require human supervision to learn from data.
A: False. While supervised learning requires labeled data, unsupervised learning algorithms can find patterns in data without human-provided labels.
TYPE: true_false`
      ]
    });

    this.templates.set(CardType.MULTIPLE_CHOICE, {
      system: `You are creating multiple-choice flashcards with one correct answer and plausible distractors. Focus on testing understanding and the ability to distinguish between similar concepts.`,
      user: `Create multiple-choice flashcards with 4 options each. Include one correct answer and three plausible but incorrect distractors.

GUIDELINES:
- Create plausible wrong answers that test understanding
- Avoid obviously incorrect or silly options
- Test discrimination between similar concepts
- Ensure only one answer is clearly correct
- Provide brief explanations for why the correct answer is right`,
      examples: [
        `CARD: 1
Q: What is the primary purpose of photosynthesis in plants?
A) To produce oxygen for the atmosphere
B) To convert sunlight into chemical energy (glucose)
C) To absorb carbon dioxide from the air
D) To create water for plant cells
ANSWER: B) To convert sunlight into chemical energy (glucose)
EXPLANATION: While photosynthesis does produce oxygen and absorb CO2, its primary purpose is to convert light energy into chemical energy (glucose) that plants can use for growth and metabolism.
TYPE: multiple_choice`
      ]
    });
  }

  /**
   * Selects the appropriate template based on context
   */
  private selectTemplate(context: PromptContext): PromptTemplate {
    if (context.cardType) {
      return this.templates.get(context.cardType) || this.templates.get(CardType.QUESTION_ANSWER)!;
    }

    // Auto-select based on keyword categories
    const categories = context.keywords.map(k => k.category);
    
    if (categories.includes(KeywordCategory.DEFINITION)) {
      return this.templates.get(CardType.DEFINITION)!;
    }
    
    if (categories.includes(KeywordCategory.PROCESS)) {
      return this.templates.get(CardType.QUESTION_ANSWER)!;
    }
    
    // Default to question-answer
    return this.templates.get(CardType.QUESTION_ANSWER)!;
  }

  /**
   * Builds the system prompt with context
   */
  private buildSystemPrompt(template: PromptTemplate, context: PromptContext): string {
    let systemPrompt = template.system;
    
    // Add subject-specific instructions if available
    if (context.subject) {
      const subjectInstructions = this.getSubjectInstructions(context.subject);
      systemPrompt += `\n\nSUBJECT FOCUS: ${subjectInstructions}`;
    }
    
    return systemPrompt;
  }

  /**
   * Builds the user prompt with content and examples
   */
  private buildUserPrompt(template: PromptTemplate, context: PromptContext): string {
    const keywordList = context.keywords
      .slice(0, 10) // Limit to top 10 keywords
      .map(k => `- ${k.term} (${k.category}, importance: ${k.importance.toFixed(2)})`)
      .join('\n');

    const contentText = context.chunks
      .slice(0, 5) // Limit to top 5 chunks
      .map(c => c.text)
      .join('\n\n');

    let userPrompt = `${template.user}

KEYWORDS TO FOCUS ON:
${keywordList}

CONTENT:
${contentText}

REQUIREMENTS:
- Generate ${context.maxCards || 5} flashcards maximum
- Focus on the most important keywords
- Ensure questions are specific and answerable
- Use clear, educational language
- Vary question complexity appropriately`;

    // Add examples if available
    if (template.examples && template.examples.length > 0) {
      userPrompt += `\n\nEXAMPLES:\n${template.examples.join('\n\n')}`;
    }

    // Add constraints if available
    if (template.constraints && template.constraints.length > 0) {
      userPrompt += `\n\nCONSTRAINTS:\n${template.constraints.map(c => `- ${c}`).join('\n')}`;
    }

    userPrompt += `\n\nFORMAT YOUR RESPONSE AS:
CARD: 1
Q: [Question here]
A: [Answer here]
TYPE: ${context.cardType || 'question_answer'}

CARD: 2
Q: [Question here]
A: [Answer here]
TYPE: ${context.cardType || 'question_answer'}

Continue this pattern for each card.`;

    return userPrompt;
  }

  /**
   * Gets difficulty-specific instructions
   */
  private getDifficultyInstructions(difficulty: DifficultyLevel): string {
    switch (difficulty) {
      case DifficultyLevel.EASY:
        return `EASY LEVEL: Focus on basic definitions, simple facts, and fundamental concepts. Use straightforward language and avoid complex relationships or applications.`;
      
      case DifficultyLevel.MEDIUM:
        return `MEDIUM LEVEL: Include some application questions and relationships between concepts. Test understanding beyond basic memorization but keep complexity moderate.`;
      
      case DifficultyLevel.HARD:
        return `HARD LEVEL: Create challenging questions that test deep understanding, complex relationships, critical thinking, and practical applications. Include analysis and synthesis questions.`;
      
      case DifficultyLevel.EXPERT:
        return `EXPERT LEVEL: Focus on advanced concepts, edge cases, complex interactions, and expert-level applications. Test mastery and ability to apply knowledge in novel situations.`;
      
      default:
        return `MIXED LEVEL: Vary the difficulty across cards, including basic, intermediate, and advanced questions to provide comprehensive coverage.`;
    }
  }

  /**
   * Gets subject-specific instructions
   */
  private getSubjectInstructions(subject: string): string {
    const subjectMap: Record<string, string> = {
      science: `Focus on scientific accuracy, use proper terminology, include cause-and-effect relationships, and emphasize experimental evidence and observations.`,
      
      mathematics: `Ensure mathematical precision, include step-by-step solutions where appropriate, focus on problem-solving strategies, and test both conceptual understanding and computational skills.`,
      
      history: `Emphasize chronological understanding, cause-and-effect relationships, historical context, and the significance of events and figures.`,
      
      language: `Focus on grammar rules, vocabulary, usage examples, and practical applications. Include context for language learning.`,
      
      literature: `Emphasize themes, character analysis, literary devices, historical context, and critical interpretation skills.`,
      
      business: `Focus on practical applications, real-world scenarios, strategic thinking, and key business concepts and frameworks.`,
      
      technology: `Emphasize practical applications, current best practices, technical accuracy, and real-world implementation considerations.`,
      
      medicine: `Ensure medical accuracy, use proper terminology, focus on clinical applications, and emphasize patient safety and evidence-based practices.`
    };

    return subjectMap[subject.toLowerCase()] || `Maintain accuracy and clarity while focusing on the key concepts and practical applications relevant to ${subject}.`;
  }

  /**
   * Validates and optimizes a generated prompt
   */
  public validatePrompt(prompt: string): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check prompt length
    if (prompt.length < 100) {
      issues.push('Prompt is too short');
      suggestions.push('Add more context and examples');
    }

    if (prompt.length > 4000) {
      issues.push('Prompt is too long');
      suggestions.push('Reduce content or split into multiple prompts');
    }

    // Check for required sections
    if (!prompt.includes('KEYWORDS')) {
      issues.push('Missing keywords section');
      suggestions.push('Include a keywords section to guide generation');
    }

    if (!prompt.includes('CONTENT')) {
      issues.push('Missing content section');
      suggestions.push('Include the source content for card generation');
    }

    if (!prompt.includes('FORMAT')) {
      issues.push('Missing format instructions');
      suggestions.push('Include clear formatting instructions for the AI');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }

  /**
   * Gets available prompt templates
   */
  public getAvailableTemplates(): CardType[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Updates a prompt template
   */
  public updateTemplate(cardType: CardType, template: Partial<PromptTemplate>): void {
    const existing = this.templates.get(cardType);
    if (existing) {
      this.templates.set(cardType, { ...existing, ...template });
    }
  }
}