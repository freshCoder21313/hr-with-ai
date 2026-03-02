export class AudioRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationFrameId: number | null = null;

  // For visualizer callback
  private onAudioLevelChange: ((level: number) => void) | null = null;

  public async startRecording(onAudioLevelChange?: (level: number) => void): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.onAudioLevelChange = onAudioLevelChange || null;

      // Setup Audio Context for Analysis (Visualizer + Silence Detection if needed)
      this.setupAudioAnalysis(this.stream);

      this.mediaRecorder = new MediaRecorder(this.stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
    } catch (error) {
      console.error('Error starting audio recording:', error);
      throw error;
    }
  }

  public async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        // If not recording, resolve with empty blob or existing chunks?
        // If we are here, likely we want to finish up.
        // Let's create blob from what we have.
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
        this.cleanup();
        resolve(audioBlob);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
        this.cleanup();
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  public cancelRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.cleanup();
  }

  private setupAudioAnalysis(stream: MediaStream) {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);

    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);

    this.analyzeAudio();
  }

  private analyzeAudio = () => {
    const currentDataArray = this.dataArray;
    if (!this.analyser || !currentDataArray) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.analyser.getByteFrequencyData(currentDataArray as any);

    // Calculate average volume level (0-1)
    let sum = 0;
    for (let i = 0; i < currentDataArray.length; i++) {
      sum += currentDataArray[i];
    }
    const average = sum / currentDataArray.length;
    const normalizedLevel = average / 255; // 0 to 1

    if (this.onAudioLevelChange) {
      this.onAudioLevelChange(normalizedLevel);
    }

    if (this.audioContext?.state === 'running') {
      this.animationFrameId = requestAnimationFrame(this.analyzeAudio);
    }
  };

  private cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.mediaRecorder = null;
    this.onAudioLevelChange = null;
  }
}

export const audioRecorderService = new AudioRecorderService();
