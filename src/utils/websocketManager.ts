export interface TranscriptionData {
  uid: string;
  text: string;
  language: string;
  start: number;
  end: number;
  completed: boolean;
  client_name?: string;
  same_output_count?: number;
  timestamp?: number;
}

export interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: number;
  name: string;
  completed?: boolean;
  language?: string;
  translations?: Record<string, string>;
}

export interface MeetingSummary {
  summary: string;
  timestamp?: number;
}

export interface ServerConfig {
  serverUrl: string;
  serverPort: string;
  model: string;
  useVad: boolean;
  username: string;
  selectedDeviceId?: string;
}

export class WebSocketManager {
  private socket: WebSocket | null = null;
  private uid: string;
  private config: ServerConfig;
  // private pingInterval: number | null = null; // Temporarily disabled
  private packetCount: number = 0;
  private logFrequency: number = 100; // Log every Nth packet
  private serverBackend: string = "";
  private lastResponseReceived: number = 0;
  private transcript: Array<[number, TranscriptionData]> = [];
  private multilingualTranscript: Array<[number, Record<string, string>]> = [];
  private lastSegment: Array<[number, TranscriptionData]> | null = null;
  private availableLanguages: string[] = [];
  private meetingSummary: string = "";
  
  onTranscription?: (data: TranscriptSegment) => void;
  onStatusChange?: (status: 'connected' | 'disconnected' | 'error' | 'waiting' | 'connecting') => void;
  onLanguageDetected?: (language: string, probability: number) => void;
  onAvailableLanguagesChange?: (languages: string[]) => void;
  onSummary?: (data: MeetingSummary) => void;

  constructor(config: ServerConfig) {
    this.config = config;
    // Generate random client ID (same as Python client)
    this.uid = Math.random().toString(36).substring(2, 15);
  }

  connect(): boolean {
    try {
      // Build WebSocket URL - always use wss:// for non-localhost connections
      let url: string;
      if (this.config.serverUrl.includes('localhost') || this.config.serverUrl.includes('127.0.0.1')) {
        url = `ws://${this.config.serverUrl}:${this.config.serverPort}`;
      } else {
        url = `wss://${this.config.serverUrl}:${this.config.serverPort}`;
      }
      
      this.onStatusChange?.('connecting');
      
      // Create WebSocket connection with binary type arraybuffer
      this.socket = new WebSocket(url);
      this.socket.binaryType = 'arraybuffer'; // Important for binary audio data
      this.packetCount = 0;
      
      // Set up event handlers
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      
      return true;
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.onStatusChange?.('error');
      return false;
    }
  }

  private handleOpen(): void {
    // Send initial configuration similar to Python client
    const initialData = {
      uid: this.uid,
      name: this.config.username,
      language: 'en',
      task: 'transcribe',
      model: this.config.model,
      use_vad: this.config.useVad,
      max_clients: 4,
      max_connection_time: 6000
    };
    
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(initialData));
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      // Handle binary data
      if (event.data instanceof ArrayBuffer) {
        return;
      }
      
      // Parse JSON data
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (e) {
        return;
      }
      
      // Check for UID mismatch (the server should respond with our UID)
      if (data.uid && data.uid !== this.uid) {
        console.error("Received message with invalid UID:", data.uid, "expected:", this.uid);
        return;
      }
      
      // Handle status messages first (similar to handle_status_messages in Python)
      if (data.status) {
        this.handleStatusMessages(data);
        return;
      }
      
      // Handle disconnect message
      if (data.message === "DISCONNECT") {
        this.onStatusChange?.('disconnected');
        return;
      }
      
      // Handle server ready message
      if (data.message === "SERVER_READY") {
        this.lastResponseReceived = Date.now();
        this.serverBackend = data.backend;
        this.onStatusChange?.('connected');
        return;
      }
      
      // Handle language detection
      if (data.language && data.language_prob) {
        if (this.onLanguageDetected) {
          this.onLanguageDetected(data.language, data.language_prob);
        }
        return;
      }
      
      // Handle meeting summary data
      if (data.summary !== undefined) {
        this.lastResponseReceived = Date.now();
        try {
          this.meetingSummary = data.summary;
          if (this.onSummary) {
            this.onSummary({
              summary: data.summary,
              timestamp: Date.now()
            });
          }
        } catch (e) {
          console.error("Error processing summary data:", e);
        }
      }
      
      // Handle transcript data - most important part for transcription
      if (data.transcript !== undefined) {
        this.lastResponseReceived = Date.now();
        try {
          this.processSegments(
            data.multilingual_transcript,
            data.transcript,
            data.last_segments,
            data.available_languages || []
          );
        } catch (e) {
          console.error("Error processing transcript data:", e);
        }
      }
    } catch (e) {
      console.error("Error handling WebSocket message:", e);
    }
  }
  
  private handleStatusMessages(data: any): void {
    const status = data.status;
    
    if (status === "WAIT") {
      this.onStatusChange?.('waiting');
      console.log(`Server is full. Estimated wait time ${Math.round(data.message)} minutes.`);
    } else if (status === "ERROR") {
      console.error(`Message from Server: ${data.message}`);
      this.onStatusChange?.('error');
    } else if (status === "WARNING") {
      console.warn(`Message from Server: ${data.message}`);
    }
  }
  
  private processSegments(
    multilingualTranscript: any,
    transcript: any,
    lastSegment: any,
    availableLanguages: string[]
  ): void {
    console.log("INITIATING PROCESSING SEGMENTS FUNCTION");
    
    // Update available languages - always
    this.availableLanguages = availableLanguages;
    if (this.onAvailableLanguagesChange) {
      this.onAvailableLanguagesChange(availableLanguages);
    }

    // Initialize tracking sets if they don't exist
    if (!this._processedTranscriptIds) {
      this._processedTranscriptIds = new Set<number>();
      this.transcript = [];
    }
    if (!this._processedTranslationIds) {
      this._processedTranslationIds = new Set<number>();
      this.multilingualTranscript = [];
    }

    try {
      // Process main transcript - exactly like Python
      if (transcript && typeof transcript === 'object') {
        const recentSegments = transcript.recent_segments || [];
        
        for (const segment of recentSegments) {
          const segmentId = segment.id;
          
          // Only process new segments
          if (!this._processedTranscriptIds.has(segmentId)) {
            this._processedTranscriptIds.add(segmentId);
            this.transcript.push([
              segment.timestamp,
              segment.data
            ]);
          }
        }
      }

      // Process multilingual transcript - independent of transcript processing
      if (multilingualTranscript && typeof multilingualTranscript === 'object') {
        const recentTranslations = multilingualTranscript.recent_segments || [];
        
        for (const translation of recentTranslations) {
          const translationId = translation.id;
          
          // Process translation regardless of transcript status
          if (!this._processedTranslationIds.has(translationId)) {
            this._processedTranslationIds.add(translationId);
            this.multilingualTranscript.push([
              translation.timestamp,
              translation.translations
            ]);
          }
        }
      }

      // Always update last segment
      this.lastSegment = lastSegment;
      this.lastResponseReceived = Date.now();
      
      // Update UI with current state (equivalent to write_transcription_to_file)
      this.updateUI();
      
    } catch (error) {
      console.error('Error processing segments:', error);
    }
  }

  // New method to update UI with current transcription state
  // This mimics the Python write_transcription_to_file function
  private updateUI(): void {
    try {
      // First process all complete transcripts
      for (const [timestamp, segment] of this.transcript) {
        // Find matching translation
        let matchingTranslation: Record<string, string> | undefined = undefined;
        
        // Look for a matching translation by timestamp
        const translationMatch = this.multilingualTranscript.find(
          ([transTime, _]) => transTime === timestamp
        );
        
        if (translationMatch) {
          matchingTranslation = translationMatch[1];
        }
        
        // Emit this segment to the listener if available
        if (this.onTranscription) {
          this.onTranscription({
            id: String(segment.uid || 'transcript-' + timestamp),
            text: segment.text,
            timestamp: timestamp,
            name: segment.client_name || 'Unknown', // Use 'Unknown' instead of current username as fallback
            completed: segment.completed || true,
            language: segment.language,
            translations: matchingTranslation
          });
        }
      }
      
      // Then process in-progress last segment if available
      if (this.lastSegment && Array.isArray(this.lastSegment) && this.lastSegment.length > 0) {
        // Extract the first element which is typically the most recent
        const lastSegmentData = this.lastSegment[0];
        
        if (Array.isArray(lastSegmentData) && lastSegmentData.length >= 2) {
          const [timestamp, data] = lastSegmentData;
          
          // Emit the in-progress transcription
          if (this.onTranscription && data && data.text) {
            this.onTranscription({
              id: `in-progress-${timestamp}`,
              text: data.text,
              timestamp: timestamp,
              name: data.client_name || 'Unknown', // Use 'Unknown' instead of current username as fallback
              completed: false,
              language: data.language,
              translations: {}
            });
          }
        }
      }
    } catch (error) {
      console.error('Error updating UI:', error);
    }
  }

  // Properties for tracking processed IDs
  private _processedTranscriptIds = new Set<number>();
  private _processedTranslationIds = new Set<number>();

  private handleError(event: Event): void {
    // No need to log the error event - just notify the status change
    this.onStatusChange?.('error');
  }

  private handleClose(event: CloseEvent): void {
    // No need to log close details
    
    // Clean up ping interval if it exists
    // if (this.pingInterval) {
    //   clearInterval(this.pingInterval);
    //   this.pingInterval = null;
    // }
    
    // Notify of disconnection
    this.onStatusChange?.('disconnected');
    
    // Reset transcript data
    this.transcript = [];
    this.multilingualTranscript = [];
    this.lastSegment = null;
  }

  // private sendPing(): void { // Temporarily disabled
  //   if (this.socket?.readyState === WebSocket.OPEN) {
  //     console.log("Sending ping to keep connection alive");
  //     this.socket.send(JSON.stringify({ type: 'ping', uid: this.uid }));
  //   }
  // }

  sendAudio(audioData: ArrayBuffer): boolean {
    // Check if socket is connected
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    
    try {
      // Send binary audio data
      this.socket.send(audioData);
      
      // Update packet count
      this.packetCount++;
      
      // Only log periodic updates to avoid console spam
      // if (this.packetCount % this.logFrequency === 0) {
      //   console.log(`Sending audio packet ${this.packetCount}, length: ${audioData.byteLength} samples`);
      // }
      
      return true;
    } catch (error) {
      // Only log errors (important to keep)
      console.error('Error sending audio data:', error);
      return false;
    }
  }

  disconnect(): void {
    console.log("Disconnecting WebSocket");
    // if (this.pingInterval) { // Temporarily disabled
    //   clearInterval(this.pingInterval);
    //   this.pingInterval = null;
    // }
    
    if (this.socket?.readyState === WebSocket.OPEN) {
      // Send graceful disconnect message
      this.socket.send(JSON.stringify({
        type: 'disconnect',
        uid: this.uid
      }));
    }
    
    this.socket?.close();
    this.socket = null;
  }
  
  // Access methods for testing and debugging
  getTranscript(): Array<[number, TranscriptionData]> {
    return this.transcript;
  }
  
  getLastSegment(): Array<[number, TranscriptionData]> | null {
    return this.lastSegment;
  }
  
  getAvailableLanguages(): string[] {
    return this.availableLanguages;
  }
  
  getMeetingSummary(): string {
    return this.meetingSummary;
  }
}