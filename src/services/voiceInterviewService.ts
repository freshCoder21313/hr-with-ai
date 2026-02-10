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

  public setOnSentenceCallback(cb: (sentence: string) => void) {
    this.onSentence = cb;
  }

  public feedStreamChunk(chunk: string) {
    this.sentenceBuffer += chunk;
    this.processBuffer();
  }

  public flush() {
    if (this.sentenceBuffer.trim().length > 0) {
      if (this.onSentence) this.onSentence(this.sentenceBuffer.trim());
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

    let match;
    // We loop to find all complete sentences
    // We use a simpler regex that matches "Sentence."
    // We need to be careful not to consume the buffer if the sentence isn't finished (e.g. ellipses...)

    // Basic implementation: split by punctuation, check length
    const endPunc = /[.?!]+(?:\s|$)/;

    // While (buffer contains end punctuation)
    // Extract sentence, emit, remove from buffer

    while (true) {
      const matchIndex = this.sentenceBuffer.search(endPunc);
      if (matchIndex === -1) break;

      // Ensure we have enough context to know it's a sentence end?
      // E.g. "ver 1.2" - "." is not sentence end.
      // Deep verification is hard without NLP.
      // For now, assume Gemini outputs proper punctuation.

      const punctuationLength = this.sentenceBuffer.match(endPunc)?.[0].length || 1;
      const sentence = this.sentenceBuffer.slice(0, matchIndex + punctuationLength).trim();

      if (sentence) {
        if (this.onSentence) this.onSentence(sentence);
      }

      this.sentenceBuffer = this.sentenceBuffer.slice(matchIndex + punctuationLength);
    }
  }
}

export const voiceInterviewService = new VoiceInterviewService();
