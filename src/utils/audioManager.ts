export class AudioManager {
  private audioContext: AudioContext | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private isRecording: boolean = false;
  private onAudioData: (data: ArrayBuffer) => void;
  private stream: MediaStream | null = null;
  private packetCount: number = 0;
  private logFrequency: number = 10; // Log every Nth packet
  private currentDeviceId: string | null = null;

  constructor(onAudioData: (data: ArrayBuffer) => void) {
    this.onAudioData = onAudioData;
  }

  async initialize(deviceId?: string): Promise<boolean> {
    try {
      // Store the device ID for future reference
      this.currentDeviceId = deviceId || null;
      
      // Close any existing resources before initializing
      this.cleanup();
      
      // Request microphone access with specific device if provided
      const constraints: MediaStreamConstraints = {
        audio: deviceId 
          ? {
              deviceId: { exact: deviceId },
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            } 
          : {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
      };
      
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Check for AudioContext support
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        console.error("AudioContext not supported in this browser");
        return false;
      }
      
      // Create audio context with 16kHz sample rate (same as the Python client)
      try {
        this.audioContext = new AudioContextClass({
          sampleRate: 16000, // MUST match the 16kHz in TranscriptionTeeClient
        });
      } catch (error) {
        // Fallback to default sample rate if setting it explicitly fails
        this.audioContext = new AudioContextClass();
      }
      
      // Create audio source from microphone
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      
      // Create processor with 4096 buffer size (same as Python client's chunk size)
      // Note: ScriptProcessorNode is deprecated but still widely supported
      // The replacement AudioWorkletNode is not as widely supported yet
      this.processor = this.audioContext.createScriptProcessor(8192, 1, 1);
      
      // Process audio data
      this.processor.onaudioprocess = this.handleAudioProcess.bind(this);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      return false;
    }
  }

  // Get current device ID
  getCurrentDeviceId(): string | null {
    return this.currentDeviceId;
  }

  // Static method to get all available audio input devices
  static async getAudioDevices(): Promise<MediaDeviceInfo[]> {
    try {
      // Request initial permission (needed to get device labels)
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Get the list of devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      // Filter to only audio input devices
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      // Stop the temporary stream
      tempStream.getTracks().forEach(track => track.stop());
      
      return audioInputs;
    } catch (error) {
      console.error('Error getting audio devices:', error);
      return [];
    }
  }

  start(): boolean {
    if (!this.microphone || !this.processor || !this.audioContext) {
      console.error("Cannot start recording - audio system not initialized");
      return false;
    }
    
    // Ensure audio context is running (needed for Safari)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    // Connect audio nodes (start capturing audio)
    this.microphone.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
    this.isRecording = true;
    this.packetCount = 0;
    return true;
  }

  stop(): void {
    if (!this.isRecording) return;
    
    // Disconnect audio nodes (stop capturing)
    if (this.processor) {
      try {
        this.processor.disconnect();
      } catch (e) {
        console.error("Error disconnecting processor:", e);
      }
    }
    
    if (this.microphone) {
      try {
        this.microphone.disconnect();
      } catch (e) {
        console.error("Error disconnecting microphone:", e);
      }
    }
    
    this.isRecording = false;
  }

  private handleAudioProcess(event: AudioProcessingEvent): void {
    if (!this.isRecording) return;
    
    try {
      // Get raw audio data from the input buffer
      const inputData = event.inputBuffer.getChannelData(0);
      
      // The server expects Float32Array data, so we'll send it directly
      // Create a copy of the Float32Array since the original may be reused by the browser
      const float32Data = new Float32Array(inputData.length);
      float32Data.set(inputData);
      
      // Update packet count but don't log it
      this.packetCount++;
      
      // Send the raw float32 buffer to be transmitted
      this.onAudioData(float32Data.buffer);
    } catch (error) {
      console.error("Error processing audio:", error);
    }
  }

  cleanup(): void {
    this.stop();
    
    // Stop all tracks in the media stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
      });
      this.stream = null;
    }
    
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (e) {
        console.error("Error closing AudioContext:", e);
      }
      this.audioContext = null;
    }
    
    this.microphone = null;
    this.processor = null;
  }
} 