import { KeywordExtractor } from '../interfaces/processors';
import { ContentChunk, Keyword, KeywordCategory } from '../types/content';
import { ValidationError } from '../models/validation';

export class BasicKeywordExtractor implements KeywordExtractor {
  private readonly minKeywordLength = 2; // Allow shorter terms like "AI", "ML"
  private readonly maxKeywordLength = 50;
  private readonly minFrequency = 1;
  
  // Common stop words to filter out
  private readonly stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
    'above', 'below', 'between', 'among', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
    'my', 'your', 'his', 'her', 'its', 'our', 'their', 'what', 'which', 'who',
    'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
    'so', 'than', 'too', 'very', 'just', 'now', 'here', 'there', 'then'
  ]);

  /**
   * Extracts keywords from content chunks using TF-IDF and pattern analysis
   */
  public extractKeywords(chunks: ContentChunk[]): Keyword[] {
    if (!chunks || chunks.length === 0) {
      throw new ValidationError(
        'chunks',
        'Cannot extract keywords from empty chunks',
        'EMPTY_CHUNKS',
        { chunks }
      );
    }

    try {
      // Step 1: Extract candidate terms from all chunks
      const candidates = this.extractCandidateTerms(chunks);
      
      // Step 2: Calculate TF-IDF scores
      const tfIdfScores = this.calculateTfIdf(candidates, chunks);
      
      // Step 3: Apply pattern-based scoring
      const patternScores = this.calculatePatternScores(candidates, chunks);
      
      // Step 4: Combine scores and create keyword objects
      const keywords = this.createKeywords(candidates, tfIdfScores, patternScores, chunks);
      
      // Step 5: Filter and validate keywords
      const validKeywords = this.filterKeywords(keywords);
      
      return validKeywords;
    } catch (error) {
      throw new ValidationError(
        'extraction',
        `Failed to extract keywords: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EXTRACTION_FAILED',
        { originalError: error, chunkCount: chunks.length }
      );
    }
  }

  /**
   * Ranks keywords by importance using combined scoring
   */
  public rankByImportance(keywords: Keyword[]): Keyword[] {
    if (!keywords || keywords.length === 0) {
      return [];
    }

    return keywords
      .sort((a, b) => b.importance - a.importance)
      .map((keyword, index) => ({
        ...keyword,
        rank: index + 1
      }));
  }

  /**
   * Extracts candidate terms from chunks
   */
  private extractCandidateTerms(chunks: ContentChunk[]): Map<string, TermInfo> {
    const candidates = new Map<string, TermInfo>();
    
    chunks.forEach((chunk, chunkIndex) => {
      const text = chunk.text.toLowerCase();
      
      // Extract single words
      const words = this.extractWords(text);
      words.forEach(word => {
        if (this.isValidTerm(word)) {
          this.addCandidate(candidates, word, chunkIndex, 'word');
        }
      });
      
      // Extract phrases (2-3 words)
      const phrases = this.extractPhrases(text);
      phrases.forEach(phrase => {
        if (this.isValidPhrase(phrase)) {
          this.addCandidate(candidates, phrase, chunkIndex, 'phrase');
        }
      });
      
      // Extract technical terms and proper nouns
      const technicalTerms = this.extractTechnicalTerms(chunk.text);
      technicalTerms.forEach(term => {
        this.addCandidate(candidates, term.toLowerCase(), chunkIndex, 'technical');
      });
    });
    
    return candidates;
  }

  /**
   * Extracts words from text
   */
  private extractWords(text: string): string[] {
    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length >= this.minKeywordLength)
      .map(word => word.toLowerCase());
  }

  /**
   * Extracts phrases (2-3 words) from text
   */
  private extractPhrases(text: string): string[] {
    const words = this.extractWords(text);
    const phrases: string[] = [];
    
    // Extract 2-word phrases
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`;
      if (phrase.length <= this.maxKeywordLength) {
        phrases.push(phrase);
      }
    }
    
    // Extract 3-word phrases
    for (let i = 0; i < words.length - 2; i++) {
      const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      if (phrase.length <= this.maxKeywordLength) {
        phrases.push(phrase);
      }
    }
    
    return phrases;
  }

  /**
   * Extracts technical terms and proper nouns
   */
  private extractTechnicalTerms(text: string): string[] {
    const terms: string[] = [];
    
    // Capitalized words (potential proper nouns)
    const capitalizedWords = text.match(/\b[A-Z][a-z]+\b/g) || [];
    terms.push(...capitalizedWords);
    
    // Acronyms
    const acronyms = text.match(/\b[A-Z]{2,}\b/g) || [];
    terms.push(...acronyms);
    
    // Technical patterns (camelCase, snake_case, etc.)
    const technicalPatterns = text.match(/\b[a-z]+[A-Z][a-zA-Z]*\b|\b[a-z]+_[a-z]+\b/g) || [];
    terms.push(...technicalPatterns);
    
    return terms.filter(term => term.length >= this.minKeywordLength && term.length <= this.maxKeywordLength);
  }

  /**
   * Checks if a term is valid for keyword extraction
   */
  private isValidTerm(term: string): boolean {
    return (
      term.length >= this.minKeywordLength &&
      term.length <= this.maxKeywordLength &&
      !this.stopWords.has(term) &&
      !/^\d+$/.test(term) && // Not just numbers
      /[a-zA-Z]/.test(term) && // Contains at least one letter
      term !== 'use' && term !== 'get' && term !== 'make' // Filter out more common terms
    );
  }

  /**
   * Checks if a phrase is valid for keyword extraction
   */
  private isValidPhrase(phrase: string): boolean {
    const words = phrase.split(' ');
    return (
      words.length >= 2 &&
      words.length <= 3 &&
      phrase.length <= this.maxKeywordLength &&
      words.every(word => !this.stopWords.has(word) || words.length === 2) && // Allow one stop word in 2-word phrases
      words.some(word => !this.stopWords.has(word)) // At least one non-stop word
    );
  }

  /**
   * Adds a candidate term to the collection
   */
  private addCandidate(candidates: Map<string, TermInfo>, term: string, chunkIndex: number, type: string): void {
    if (!candidates.has(term)) {
      candidates.set(term, {
        term,
        frequency: 0,
        chunkIndices: new Set(),
        type,
        contexts: []
      });
    }
    
    const info = candidates.get(term)!;
    info.frequency++;
    info.chunkIndices.add(chunkIndex);
  }

  /**
   * Calculates TF-IDF scores for candidate terms
   */
  private calculateTfIdf(candidates: Map<string, TermInfo>, chunks: ContentChunk[]): Map<string, number> {
    const scores = new Map<string, number>();
    const totalChunks = chunks.length;
    
    candidates.forEach((info, term) => {
      // Term Frequency: frequency of term in all chunks
      const tf = info.frequency;
      
      // Document Frequency: number of chunks containing the term
      const df = info.chunkIndices.size;
      
      // Inverse Document Frequency
      const idf = Math.log(totalChunks / df);
      
      // TF-IDF Score
      const tfIdf = tf * idf;
      
      scores.set(term, tfIdf);
    });
    
    return scores;
  }

  /**
   * Calculates pattern-based scores for terms
   */
  private calculatePatternScores(candidates: Map<string, TermInfo>, chunks: ContentChunk[]): Map<string, number> {
    const scores = new Map<string, number>();
    
    candidates.forEach((info, term) => {
      let score = 0;
      
      // Boost for technical terms
      if (info.type === 'technical') {
        score += 0.3;
      }
      
      // Boost for phrases
      if (info.type === 'phrase') {
        score += 0.2;
      }
      
      // Boost for terms in important chunks
      info.chunkIndices.forEach(chunkIndex => {
        const chunk = chunks[chunkIndex];
        if (chunk && chunk.importance > 0.7) {
          score += 0.2;
        }
      });
      
      // Boost for terms that appear in multiple chunks
      if (info.chunkIndices.size > 1) {
        score += 0.1 * Math.min(info.chunkIndices.size, 5);
      }
      
      // Boost for terms with certain patterns
      if (this.hasDefinitionPattern(term, chunks)) {
        score += 0.4;
      }
      
      if (this.hasQuestionPattern(term, chunks)) {
        score += 0.3;
      }
      
      scores.set(term, score);
    });
    
    return scores;
  }

  /**
   * Checks if term appears in definition patterns
   */
  private hasDefinitionPattern(term: string, chunks: ContentChunk[]): boolean {
    const definitionPatterns = [
      new RegExp(`${term}\\s+is\\s+`, 'i'),
      new RegExp(`${term}\\s+means\\s+`, 'i'),
      new RegExp(`${term}\\s+refers\\s+to`, 'i'),
      new RegExp(`definition\\s+of\\s+${term}`, 'i'),
      new RegExp(`${term}\\s*:\\s*`, 'i')
    ];
    
    return chunks.some(chunk => 
      definitionPatterns.some(pattern => pattern.test(chunk.text))
    );
  }

  /**
   * Checks if term appears in question patterns
   */
  private hasQuestionPattern(term: string, chunks: ContentChunk[]): boolean {
    const questionPatterns = [
      new RegExp(`what\\s+is\\s+${term}`, 'i'),
      new RegExp(`how\\s+does\\s+${term}`, 'i'),
      new RegExp(`why\\s+is\\s+${term}`, 'i'),
      new RegExp(`${term}\\s*\\?`, 'i')
    ];
    
    return chunks.some(chunk => 
      questionPatterns.some(pattern => pattern.test(chunk.text))
    );
  }

  /**
   * Creates keyword objects from candidates and scores
   */
  private createKeywords(
    candidates: Map<string, TermInfo>,
    tfIdfScores: Map<string, number>,
    patternScores: Map<string, number>,
    chunks: ContentChunk[]
  ): Keyword[] {
    const keywords: Keyword[] = [];
    
    candidates.forEach((info, term) => {
      const tfIdf = tfIdfScores.get(term) || 0;
      const pattern = patternScores.get(term) || 0;
      
      // Combined importance score (normalized) - adjusted for better scoring
      const importance = Math.min(1, (tfIdf * 0.4 + pattern * 0.6) / 3);
      
      // Extract contexts where the term appears
      const contexts = this.extractContexts(term, info.chunkIndices, chunks);
      
      // Determine category
      const category = this.determineCategory(term, contexts);
      
      keywords.push({
        term,
        importance,
        context: contexts,
        category,
        frequency: info.frequency,
        chunkCount: info.chunkIndices.size
      });
    });
    
    return keywords;
  }

  /**
   * Extracts context sentences for a term
   */
  private extractContexts(term: string, chunkIndices: Set<number>, chunks: ContentChunk[]): string[] {
    const contexts: string[] = [];
    const maxContexts = 3;
    
    Array.from(chunkIndices).slice(0, maxContexts).forEach(chunkIndex => {
      const chunk = chunks[chunkIndex];
      if (chunk) {
        // Find sentences containing the term
        const sentences = chunk.text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const matchingSentences = sentences.filter(sentence => 
          sentence.toLowerCase().includes(term.toLowerCase())
        );
        
        if (matchingSentences.length > 0) {
          contexts.push(matchingSentences[0].trim());
        }
      }
    });
    
    return contexts;
  }

  /**
   * Determines the category of a keyword
   */
  private determineCategory(term: string, contexts: string[]): KeywordCategory {
    const contextText = contexts.join(' ').toLowerCase();
    
    // Check for definition patterns
    if (contextText.includes('definition') || 
        contextText.includes('means') || 
        contextText.includes('refers to') ||
        contextText.includes(`${term} is`)) {
      return KeywordCategory.DEFINITION;
    }
    
    // Check for process patterns
    if (contextText.includes('process') || 
        contextText.includes('method') || 
        contextText.includes('procedure') ||
        contextText.includes('steps')) {
      return KeywordCategory.PROCESS;
    }
    
    // Check for example patterns
    if (contextText.includes('example') || 
        contextText.includes('instance') || 
        contextText.includes('such as') ||
        contextText.includes('for example')) {
      return KeywordCategory.EXAMPLE;
    }
    
    // Check for fact patterns
    if (contextText.includes('fact') || 
        contextText.includes('data') || 
        contextText.includes('statistic') ||
        /\d+/.test(contextText)) {
      return KeywordCategory.FACT;
    }
    
    // Default to concept
    return KeywordCategory.CONCEPT;
  }

  /**
   * Filters keywords based on quality criteria
   */
  private filterKeywords(keywords: Keyword[]): Keyword[] {
    return keywords
      .filter(keyword => {
        // Filter by minimum frequency
        return (keyword.frequency || 0) >= this.minFrequency;
      })
      .filter(keyword => {
        // Filter by minimum importance (more lenient)
        return keyword.importance > 0.05;
      })
      .filter(keyword => {
        // Filter out very common terms that passed initial filtering
        const commonTerms = ['thing', 'way', 'time', 'part', 'use', 'make', 'get', 'take'];
        return !commonTerms.includes(keyword.term.toLowerCase());
      })
      .slice(0, 50); // Limit to top 50 keywords
  }

  /**
   * Gets extraction statistics
   */
  public getExtractionStats(keywords: Keyword[]): {
    totalKeywords: number;
    categoryDistribution: Record<KeywordCategory, number>;
    averageImportance: number;
    topKeywords: Keyword[];
  } {
    const categoryDistribution = keywords.reduce((acc, keyword) => {
      acc[keyword.category] = (acc[keyword.category] || 0) + 1;
      return acc;
    }, {} as Record<KeywordCategory, number>);
    
    const averageImportance = keywords.length > 0 
      ? keywords.reduce((sum, k) => sum + k.importance, 0) / keywords.length 
      : 0;
    
    const topKeywords = keywords
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 10);
    
    return {
      totalKeywords: keywords.length,
      categoryDistribution,
      averageImportance,
      topKeywords
    };
  }
}

// Helper interface for term information during extraction
interface TermInfo {
  term: string;
  frequency: number;
  chunkIndices: Set<number>;
  type: string;
  contexts: string[];
}

// Helper interface for term information during extraction