/**
 * Strips AI action tags, knowledge-graph brackets, and system control tokens
 * before speech synthesis so the TTS engine doesn't vocalize raw code or markup.
 */
export function stripVoiceControlTokens(text: string): string {
  if (!text) return '';
  return text
    // Strip XML action tags like <ACTION type="CODE" lang="javascript" />
    .replace(/<ACTION\b[^>]*\/?>/gi, '')
    // Strip [[END_SESSION]]
    .replace(/\[\[END_SESSION\]\]/gi, '')
    // Replace [[Concept]] with just Concept
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    // Replace Markdown search links [Keyword](search:Keyword) with Keyword
    .replace(/\[([^\]]+)\]\(search:[^)]+\)/g, '$1')
    // Replace Markdown links [text](url) with text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove markdown code blocks and backticks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove markdown bold/italic asterisks
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    // Collapse excess spaces and newlines
    .replace(/\s+/g, ' ')
    .trim();
}

export class VoiceInterviewService {
  private sentenceBuffer: string = '';
  private onSentence: ((sentence: string) => void) | null = null;

  // Regex for sentence splitting (basic)
  // Splits on . ? ! followed by space or end of string
  private sentenceRegex = /([.?!])\s+(?=[A-Z])/g;

  constructor() {}

  public reset() {
    this.sentenceBuffer = '';
  }

  public setOnSentenceCallback(cb: ((sentence: string) => void) | null) {
    this.onSentence = cb;
  }

  public feedStreamChunk(chunk: string) {
    this.sentenceBuffer += chunk;
    this.processBuffer();
  }

  public flush() {
    const raw = this.sentenceBuffer.trim();
    if (raw.length > 0) {
      const cleaned = stripVoiceControlTokens(raw);
      if (cleaned && this.onSentence) this.onSentence(cleaned);
    }
    this.sentenceBuffer = '';
  }

  private processBuffer() {
    // Check if we have a full sentence
    // Simple heuristic: look for punctuation
    // We want to avoid splitting "Mr. Smith" or "e.g." incorrectly
    // But for a basic implementation, we can look for [.?!] followed by space or newline

    // A clearer approach:
    // We can't rely on lookahead easily because the next chunk might be the space or the capital letter.
    // But we act on what we have.

    // Let's iterate and find split points.

    // Improving regex to include common sentence endings
    // match [content][.?!]space

    // We loop to find all complete sentences
    // We use a simpler regex that matches "Sentence."
    // We need to be careful not to consume the buffer if the sentence isn't finished (e.g. ellipses...)

    // Basic implementation: split by punctuation, check length
    const endPunc = /[.?!]+(?:\s|$)/;

    // While (buffer contains end punctuation)
    // Extract sentence, emit, remove from buffer

    let hasSentence = true;
    while (hasSentence) {
      const matchIndex = this.sentenceBuffer.search(endPunc);
      if (matchIndex === -1) {
        hasSentence = false;
        break;
      }

      // Ensure we have enough context to know it's a sentence end?
      // E.g. "ver 1.2" - "." is not sentence end.
      // Deep verification is hard without NLP.
      // For now, assume Gemini outputs proper punctuation.

      const punctuationLength = this.sentenceBuffer.match(endPunc)?.[0].length || 1;
      const sentence = this.sentenceBuffer.slice(0, matchIndex + punctuationLength).trim();

      if (sentence) {
        const cleaned = stripVoiceControlTokens(sentence);
        if (cleaned && this.onSentence) this.onSentence(cleaned);
      }

      this.sentenceBuffer = this.sentenceBuffer.slice(matchIndex + punctuationLength);
    }
  }
}

export const voiceInterviewService = new VoiceInterviewService();
