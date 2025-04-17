"use client";

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AudioManager } from '../../utils/audioManager';
import { MeetingSummary, WebSocketManager, TranscriptSegment, ServerConfig as BaseServerConfig } from '../../utils/websocketManager';

// Add new interface for better formatting of multilingual transcriptions
interface FormattedTranslations {
  original: {
    text: string;
    language: string | null;
  };
  translations: {
    language: string;
    text: string;
  }[];
}

// Add a new interface for grouped transcriptions by speaker
interface GroupedTranscription {
  speaker: string;
  isUser: boolean;
  segments: TranscriptSegment[];
  lastTimestamp: number;
}

// Extend the imported ServerConfig to include selectedDeviceId
interface ServerConfig extends BaseServerConfig {
  selectedDeviceId: string;
}

// Add a new component to display a multilingual transcript section
const TranscriptionBlock = ({ 
  transcript, 
  showAllTranslations, 
  selectedLanguage, 
  detectedLanguage = null,
  isUser = false
}: { 
  transcript: TranscriptSegment, 
  showAllTranslations: boolean, 
  selectedLanguage: string | null,
  detectedLanguage?: string | null,
  isUser?: boolean
}) => {
  // Format the timestamp for display
  const formatTime = (timestamp: number): string => {
    // Convert to milliseconds if needed (if timestamp is in seconds)
    const timestampMs = timestamp > 10000000000 ? timestamp : timestamp * 1000;
    const date = new Date(timestampMs);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  
  // Get border color based on language - Adjusted for dark theme
  const getLanguageBorderColor = (language: string): string => {
    const colorMap: Record<string, string> = {
      'en': 'border-blue-400',
      'es': 'border-yellow-400',
      'fr': 'border-indigo-400', 
      'de': 'border-amber-400',
      'zh': 'border-red-400',
      'ja': 'border-pink-400',
      'ko': 'border-purple-400',
      'ru': 'border-emerald-400',
      'ar': 'border-teal-400',
      'hi': 'border-orange-400',
      'pt': 'border-lime-400',
      'it': 'border-cyan-400',
      'vi': 'border-green-400'
    };
    return colorMap[language] || 'border-gray-400';
  };
  
  // Get text color based on language - Adjusted for dark theme
  const getLanguageTextColor = (language: string): string => {
    const colorMap: Record<string, string> = {
      'en': 'text-blue-300',
      'es': 'text-yellow-300',
      'fr': 'text-indigo-300', 
      'de': 'text-amber-300',
      'zh': 'text-red-300',
      'ja': 'text-pink-300',
      'ko': 'text-purple-300',
      'ru': 'text-emerald-300',
      'ar': 'text-teal-300',
      'hi': 'text-orange-300',
      'pt': 'text-lime-300',
      'it': 'text-cyan-300',
      'vi': 'text-green-300'
    };
    return colorMap[language] || 'text-gray-300';
  };
  
  // Lofi themed backgrounds for user vs other
  const bgColor = isUser ? 'bg-purple-800/30 backdrop-blur-sm' : 'bg-gray-700/30 backdrop-blur-sm';
  const borderColor = isUser ? 'border-purple-600/50' : 'border-gray-500/50';

  // Ensure translations are properly extracted and not undefined
  const translations = transcript.translations || {};
  const translationKeys = Object.keys(translations);
  const hasTranslations = translationKeys.length > 0;
  
  return (
    <div className={`${bgColor} rounded-lg p-3 text-black/90 shadow-md`}> {/* Changed text color, added shadow */}
      <div className="text-gray-400 text-xs mb-1 flex justify-between"> {/* Adjusted text color */}
        <span className="flex items-center space-x-1">
          <span>{transcript.completed ? "Completed" : "Live"}</span>
          {transcript.name && (
            <span className="px-1.5 py-0.5 bg-gray-600/50 text-gray-300 rounded-full text-xs ml-1">
              {transcript.name}
            </span>
          )}
          {transcript.language && (
            <span className="px-1.5 py-0.5 bg-gray-600/50 text-gray-300 rounded-full text-xs ml-1"> {/* Adjusted colors */}
              {transcript.language}
            </span>
          )}
          {hasTranslations && (
            <span className="px-1.5 py-0.5 bg-green-800/50 text-green-300 rounded-full text-xs ml-1"> {/* Adjusted colors */}
              +{translationKeys.length} translations
            </span>
          )}
        </span>
        <span>
          {formatTime(transcript.timestamp)}
        </span>
      </div>
      
      {showAllTranslations ? (
        /* Show all languages in a transcription.txt-like format */
        <div className="space-y-2 mt-2">
          {/* Original text first */}
          <div className={`border-l-4 ${getLanguageBorderColor(transcript.language || 'unknown')} pl-2 py-1`}>
            <div className={`text-xs font-medium ${getLanguageTextColor(transcript.language || 'unknown')}`}>
              [{transcript.language || detectedLanguage || 'ORIGINAL'}]
            </div>
            <div className="text-md">{transcript.text}</div>
          </div>
          
          {/* Then all translations */}
          {translationKeys.map(lang => {
            const text = translations[lang];
            if (!text) return null;
            
            return (
              <div key={lang} className={`border-l-4 ${getLanguageBorderColor(lang)} pl-2 py-1`}>
                <div className={`text-xs font-medium ${getLanguageTextColor(lang)}`}>[{lang}]</div>
                <div className="text-md">{text}</div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Show only selected language or original */
        <div className="mt-2">
          <div className="text-xs font-medium text-gray-400 mb-1"> {/* Adjusted text color */}
            {selectedLanguage && translations[selectedLanguage] 
              ? `Translation (${selectedLanguage})`
              : `Original (${transcript.language || detectedLanguage || 'Unknown'})`}
          </div>
          <div className="text-md">
            {selectedLanguage && translations[selectedLanguage]
              ? translations[selectedLanguage]
              : transcript.text}
          </div>
        </div>
      )}
      
      {/* Separator line like in transcription.txt */}
      <div className={`mt-3 pt-2 border-t ${borderColor} text-xs text-gray-500 text-center flex justify-center items-center`}> {/* Adjusted text color */}
        <span className="inline-block mx-1">———</span>
        <span>{transcript.completed ? "Final Transcription" : "In Progress"}</span>
        <span className="inline-block mx-1">———</span>
      </div>
    </div>
  );
};

export default function Room() {
  const router = useRouter();
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'error' | 'waiting' | 'connecting'>('disconnected');
  
  // Store transcripts by their server-assigned ID for reliable updates
  const [transcriptMap, setTranscriptMap] = useState<Record<string, TranscriptSegment>>({});
  
  // Global ID tracking for transcriptions/translations
  const [globalTranscriptId, setGlobalTranscriptId] = useState<string | null>(null);
  const [latestTranscriptData, setLatestTranscriptData] = useState<TranscriptSegment | null>(null);
  
  // Derived state - convert map to array for rendering
  const transcripts = useMemo(() => {
    return Object.values(transcriptMap)
      .filter(t => t.timestamp && t.text)
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  }, [transcriptMap]);
  
  // Separate display transcripts and translations
  const displayTranscripts = useMemo(() => {
    // Get all transcripts up to the global ID
    if (!globalTranscriptId) {
      // If no global ID, return the most recent transcript (if any)
      return latestTranscriptData ? [latestTranscriptData] : [];
    }
    
    // Get all transcripts with IDs up to the global ID
    return transcripts.filter(t => {
      // If it's a numerical ID, compare numerically
      if (t.id && globalTranscriptId && !isNaN(Number(t.id)) && !isNaN(Number(globalTranscriptId))) {
        return Number(t.id) <= Number(globalTranscriptId);
      }
      // Otherwise return all transcripts
      return true;
    });
  }, [transcripts, globalTranscriptId, latestTranscriptData]);
  
  // Get translations for display
  const displayTranslations = useMemo(() => {
    // Filter transcripts with translations
    return displayTranscripts.filter(t => 
      t.translations && Object.keys(t.translations).length > 0
    );
  }, [displayTranscripts]);
  
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedLanguage') || null;
    }
    return null;
  });
  const [showAllTranslations, setShowAllTranslations] = useState<boolean>(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [debugMode, setDebugMode] = useState(false);
  
  // Track the newest transcript ID to highlight it
  const [newestTranscriptId, setNewestTranscriptId] = useState<string | null>(null);
  
  // Add state for meeting summary and active tab
  const [meetingSummary, setMeetingSummary] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'transcription' | 'summary'>('transcription');
  
  const audioManagerRef = useRef<AudioManager | null>(null);
  const wsManagerRef = useRef<WebSocketManager | null>(null);
  
  // Load configuration when page loads
  useEffect(() => {
    const savedConfig = sessionStorage.getItem('sttConfig');
    if (!savedConfig) {
      router.replace('/');
      return;
    }
    
    try {
      const parsedConfig = JSON.parse(savedConfig);
      console.log("Loaded config:", parsedConfig);
      setConfig(parsedConfig);
    } catch (e) {
      console.error("Error parsing config:", e);
      router.replace('/');
    }
  }, [router]);
  
  // Initialize WebSocket and Audio when config is loaded
  useEffect(() => {
    if (!config) return;
    
    // Set connecting status first
    setStatus('connecting');
    
    // Initialize WebSocket
    wsManagerRef.current = new WebSocketManager(config);
    
    // Set up WebSocket callbacks
    wsManagerRef.current.onStatusChange = (newStatus) => {
      setStatus(newStatus);
      
      if (newStatus === 'error' || newStatus === 'disconnected') {
        // Stop audio recording if connection is lost or errors out
        if (isRecording) {
          audioManagerRef.current?.stop();
          setIsRecording(false);
        }
      }
      
      // Handle connection error states
      if (newStatus === 'error') {
        const attempts = connectionAttempts + 1;
        setConnectionAttempts(attempts);
        
        if (attempts >= 3) {
          setConnectionError(`Failed to connect to server after ${attempts} attempts. Please check your server URL and port. Make sure your server is running and accessible.`);
        } else {
          setConnectionError(`Connection attempt ${attempts} failed. Retrying...`);
          // Try to reconnect after a short delay
          setTimeout(() => {
            if (wsManagerRef.current && status !== 'connected') { // Check status before retry
              wsManagerRef.current.connect();
            }
          }, 3000);
        }
      } else if (newStatus === 'connected') {
        setConnectionError(null);
        setConnectionAttempts(0);
      } else if (newStatus === 'waiting') {
        setConnectionError("Server is at capacity. Please wait until a slot becomes available.");
      }
    };
    
    // Handle transcriptions from WebSocketManager
    wsManagerRef.current.onTranscription = (data: TranscriptSegment) => {
      // Validate required fields
      if (!data || !data.id) {
        console.error("Invalid transcript received:", data);
        return;
      }
      
      // Mark this as the newest transcript
      setNewestTranscriptId(data.id);
      
      // Store the latest transcript data for UI display
      setLatestTranscriptData(data);
      
      // If the ID is newer than our global ID, update the global ID
      if (!globalTranscriptId || (
        !isNaN(Number(data.id)) && 
        !isNaN(Number(globalTranscriptId)) && 
        Number(data.id) > Number(globalTranscriptId)
      )) {
        setGlobalTranscriptId(data.id);
      }
      
      // Update the transcript map
      setTranscriptMap(prev => {
        // Preserve all existing transcripts
        const newMap = { ...prev };
        
        // Get existing transcript with same ID if it exists
        const existingTranscript = newMap[data.id];
        
        if (existingTranscript) {
          // Update existing transcript, merging translations rather than replacing
          newMap[data.id] = {
            ...existingTranscript,
            ...data,
            // Special handling for translations - merge instead of overwrite
            translations: {
              ...(existingTranscript.translations || {}),
              ...(data.translations || {})
            }
          };
        } else {
          // Add new transcript with its server-assigned ID
          newMap[data.id] = data;
        }
        
        return newMap;
      });
    };
    
    wsManagerRef.current.onLanguageDetected = (language: string, probability: number) => {
      setDetectedLanguage(language);
    };
    
    wsManagerRef.current.onAvailableLanguagesChange = (languages: string[]) => {
      setAvailableLanguages(languages);
      
      // Only set default language if no language is selected yet
      if (languages.length > 0 && !selectedLanguage) {
        const savedLanguage = localStorage.getItem('selectedLanguage');
        if (savedLanguage && languages.includes(savedLanguage)) {
          setSelectedLanguage(savedLanguage);
        } else {
          setSelectedLanguage(languages[0]);
          localStorage.setItem('selectedLanguage', languages[0]);
        }
      }
    };
    
    // Handle meeting summary updates
    wsManagerRef.current.onSummary = (data: MeetingSummary) => {
      if (data.summary) {
        setMeetingSummary(data.summary);
      }
    };
    
    // Connect to server
    wsManagerRef.current.connect();
    
    // Initialize Audio Manager with the selected device ID from config
    audioManagerRef.current = new AudioManager((audioData) => {
      wsManagerRef.current?.sendAudio(audioData);
    });
    
    // Use the device ID from config
    audioManagerRef.current.initialize(config.selectedDeviceId).then(success => {
      if (!success) {
        setConnectionError("Failed to access microphone. Please check your browser permissions.");
      }
    });
    
    // Cleanup on unmount
    return () => {
      if (wsManagerRef.current) {
        wsManagerRef.current.disconnect();
      }
      
      if (audioManagerRef.current) {
        audioManagerRef.current.cleanup();
      }
    };
  }, [config]);
  
  // Handle mic start/stop
  const toggleRecording = async () => {
    if (isRecording) {
      audioManagerRef.current?.stop();
      setIsRecording(false);
    } else {
      if (audioManagerRef.current?.start()) {
        setIsRecording(true);
      } else {
        setConnectionError("Failed to start recording. Please check your microphone.");
      }
    }
  };
  
  // Handle leaving room
  const leaveRoom = () => {
    audioManagerRef.current?.stop();
    wsManagerRef.current?.disconnect();
    router.replace('/');
  };
  
  // Toggle debug mode
  const toggleDebugMode = () => {
    setDebugMode(!debugMode);
  };
  
  // Toggle showing all translations
  const toggleAllTranslations = () => {
    setShowAllTranslations(!showAllTranslations);
  };
  
  // Change selected language for translations
  const changeLanguage = (language: string) => {
    setSelectedLanguage(language);
    // Store in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedLanguage', language);
    }
  };
  
  // Format transcript with translations for display
  const formatTranscriptWithTranslations = (transcript: TranscriptSegment): FormattedTranslations => {
    const result: FormattedTranslations = {
      original: {
        text: transcript.text || "",
        language: transcript.language || detectedLanguage
      },
      translations: []
    };
    
    if (transcript.translations) {
      result.translations = Object.entries(transcript.translations).map(([lang, text]) => ({
        language: lang,
        text
      }));
    }
    
    return result;
  };
  
  // Group transcripts by speaker into conversation threads
  const conversationThreads = useMemo(() => {
    // Filter out invalid transcripts and sort by timestamp (oldest first)
    const validTranscripts = transcripts
      .filter(t => t.timestamp && t.text)
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    
    // Group by speaker
    const speakerMap: Record<string, TranscriptSegment[]> = {};
    
    // Organize transcripts by speaker
    validTranscripts.forEach(transcript => {
      const speaker = transcript.name || 'Unknown';
      if (!speakerMap[speaker]) {
        speakerMap[speaker] = [];
      }
      speakerMap[speaker].push(transcript);
    });
    
    // Convert to GroupedTranscription format
    const threads: GroupedTranscription[] = Object.entries(speakerMap).map(([speaker, segments]) => {
      return {
        speaker,
        isUser: speaker === config?.username,
        segments: segments,
        lastTimestamp: segments[segments.length - 1].timestamp || Date.now()
      };
    });
    
    // Sort threads by their first message timestamp
    return threads.sort((a, b) => {
      const aFirstTime = a.segments[0].timestamp || 0;
      const bFirstTime = b.segments[0].timestamp || 0;
      return aFirstTime - bFirstTime;
    });
  }, [transcripts, config?.username]);
  
  // Keep all conversation threads, no time limit filtering
  const conversationDisplay = useMemo(() => {
    return conversationThreads;
  }, [conversationThreads]);
  
  // Get transcripts marked as from the user or those with highest confidence
  const userTranscripts = useMemo(() => {
    const userSegments = transcripts.filter(t => t.name === config?.username);
    
    // If we have user segments, return them
    if (userSegments.length > 0) {
      return userSegments;
    }
    
    // If no user segments, return the most recent transcript
    return transcripts.length > 0 ? [transcripts[0]] : [];
  }, [transcripts]);

  // Get transcripts from other participants (not the user)
  const otherTranscripts = useMemo(() => {
    return transcripts.filter(t => t.name !== config?.username);
  }, [transcripts]);
  
  // Get latest user transcript - look at any transcript if no user transcript is found
  const latestUserTranscript = userTranscripts.length > 0 ? userTranscripts[0] : 
                               transcripts.length > 0 ? transcripts[0] : null;
  
  // More aggressive check for translations
  const hasTranslations = transcripts.some(t => 
    t.translations && Object.keys(t.translations || {}).length > 0
  ) || availableLanguages.length > 0; // Show if we have available languages too
  
  // Simplify debug functions too
  const forceRerender = () => {
    setTranscriptMap(prev => {
      const newMap = { ...prev };
      // Update timestamp on all transcripts to force re-render
      Object.keys(newMap).forEach(id => {
        newMap[id] = {
          ...newMap[id],
          timestamp: Date.now()
        };
      });
      return newMap;
    });
  };
  
  const addSampleTranslations = () => {
    if (latestUserTranscript) {
      setTranscriptMap(prev => {
        const newMap = { ...prev };
        
        // Add sample translations to the latest user transcript
        const sampleTranslations = {
          en: latestUserTranscript.text,
          vi: "Bản dịch mẫu - tiếng Việt",
          es: "Traducción de muestra - español",
          fr: "Traduction exemple - français"
        };
        
        // Generate a unique ID for the test transcript
        const testId = `sample-${Date.now()}`;
        
        newMap[testId] = {
          ...latestUserTranscript,
          id: testId,
          translations: sampleTranslations,
          timestamp: Date.now()
        };
        
        return newMap;
      });
    }
  };
  
  const createTestTranscript = () => {
    const testId = `test-${Date.now()}`;
    const testTranscript: TranscriptSegment = {
      id: testId,
      text: "This is a manually created test transcript. It should appear in your transcript list.",
      timestamp: Date.now(),
      name: config?.username || "TestUser",
      completed: true,
      language: 'en',
      translations: {
        'es': 'Esta es una transcripción de prueba creada manualmente.',
        'fr': 'Ceci est une transcription de test créée manuellement.'
      }
    };
    
    setTranscriptMap(prev => ({
      ...prev,
      [testId]: testTranscript
    }));
  };
  
  const toggleTranslationUI = () => {
    // Override the hasTranslations flag directly in the DOM
    const translationElem = document.querySelector('.translation-controls');
    if (translationElem) {
      translationElem.classList.toggle('hidden');
    }
  };
  
  // Keep the checkTranscripts function but simplify it
  const checkTranscripts = () => {
    console.log(`Total transcripts: ${Object.keys(transcriptMap).length}`);
    console.log(`Transcript IDs: ${Object.keys(transcriptMap).join(', ')}`);
    console.log(`Sorted transcripts: `, transcripts);
  };
  
  // Restore the renderTranslations function
  const renderTranslations = () => {
    if (displayTranslations.length === 0) {
      return (
        <div className="text-center py-6 text-gray-500">
          No translations available yet.
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {displayTranslations.map((segment) => {
          const isNewest = segment.id === newestTranscriptId;
          const translations = segment.translations || {};
          
          return (
            <div 
              key={`translation-${segment.id}`}
              className={`p-3 rounded-md ${isNewest ? 'bg-blue-50 border-l-4 border-blue-500' : 'bg-gray-50'}`}
            >
              {/* Header with timestamp and speaker */}
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <span className="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded mr-2">
                    {formatTime(segment.timestamp)}
                  </span>
                  <span className="text-sm font-medium text-gray-700">
                    {segment.name}
                  </span>
                </div>
                
                {segment.language && (
                  <span className="px-2 py-1 bg-gray-200 rounded-full text-xs">
                    {segment.language}
                  </span>
                )}
              </div>
              
              {/* Show translations */}
              <div className="mt-1">
                {showAllTranslations ? (
                  /* When showing all languages, display all translations */
                  <div className="space-y-2">
                    {Object.entries(translations).map(([lang, text]) => (
                      <div key={lang} className={`${getLanguageBorderColor(lang)} border-l-2 pl-2 mb-2`}>
                        <div className={`text-xs font-medium ${getLanguageTextColor(lang)}`}>[{lang}]</div>
                        <div className="text-md">{text}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* When showing selected language, display just that one */
                  selectedLanguage && translations[selectedLanguage] ? (
                    <div className="text-md pl-2 border-l-2 border-gray-300">
                      {translations[selectedLanguage]}
                    </div>
                  ) : (
                    /* Fallback to first available translation if selected language not available */
                    <div className="text-md pl-2 border-l-2 border-gray-300">
                      {translations[Object.keys(translations)[0]]}
                    </div>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  // Restore the renderLatestTranscription function
  const renderLatestTranscription = () => {
    if (!latestTranscriptData) {
      return (
        <div className="text-center py-6 text-gray-500">
          No transcription available yet. Start speaking to see transcripts appear here.
        </div>
      );
    }
    
    return (
      <div className="p-3 rounded-md bg-blue-50 border-l-4 border-blue-500">
        {/* Header with timestamp and speaker */}
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center">
            <span className="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded mr-2">
              {formatTime(latestTranscriptData.timestamp)}
            </span>
            <span className="text-sm font-medium text-gray-700">
              {latestTranscriptData.name}
            </span>
          </div>
          
          {latestTranscriptData.language && (
            <span className="px-2 py-1 bg-gray-200 rounded-full text-xs">
              {latestTranscriptData.language}
            </span>
          )}
        </div>
        
        {/* Latest transcription text */}
        <div className="text-md font-medium mb-2">
          {latestTranscriptData.text}
        </div>
        
        {/* Show in-progress indicator if needed */}
        {latestTranscriptData.id.startsWith('in-progress') && (
          <div className="text-xs text-gray-500 mt-1 italic">
            Transcribing...
          </div>
        )}
      </div>
    );
  };
  
  // Add a function to render the meeting summary
  const renderMeetingSummary = () => {
    if (!meetingSummary) {
      return (
        <div className="text-center py-6 text-gray-400">
          No meeting summary available yet. The summary will appear here when it's generated by the server.
        </div>
      );
    }
    
    // Handle case where meetingSummary is an object instead of a string
    const renderSummaryContent = () => {
      if (typeof meetingSummary === 'string') {
        return <div className="whitespace-pre-wrap text-md">{meetingSummary}</div>;
      }
      
      // Handle structured summary object
      try {
        // If it's an object with keys like 'Meeting purpose', 'Key takeaways', etc.
        const summaryObj = typeof meetingSummary === 'string' ? JSON.parse(meetingSummary) : meetingSummary;
        
        return (
          <div className="space-y-4">
            {Object.entries(summaryObj).map(([key, value]) => (
              <div key={key} className="mb-3">
                <h4 className="text-md font-medium text-purple-200 mb-2">{key}</h4>
                {Array.isArray(value) ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {value.map((item, index) => (
                      <li key={index} className="text-sm">{item}</li>
                    ))}
                  </ul>
                ) : typeof value === 'object' ? (
                  // Handle nested objects (like Topics)
                  <div className="pl-3 space-y-3">
                    {Object.entries(value || {}).map(([subKey, subValue]) => (
                      <div key={subKey} className="mb-2">
                        <h5 className="text-sm font-medium text-purple-300 mb-1">{subKey}</h5>
                        {Array.isArray(subValue) ? (
                          <ul className="list-disc pl-5 space-y-1">
                            {subValue.map((item, idx) => (
                              <li key={idx} className="text-sm">{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm">{String(subValue)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm">{String(value)}</p>
                )}
              </div>
            ))}
          </div>
        );
      } catch (e) {
        // Fallback to string representation if parsing fails
        console.error("Error rendering meeting summary:", e);
        return <div className="whitespace-pre-wrap text-md">{String(meetingSummary)}</div>;
      }
    };
    
    return (
      <div className="p-4 rounded-lg bg-purple-800/30 backdrop-blur-sm text-white/90 shadow-md">
        <div className="mb-3 pb-2 border-b border-purple-600/50">
          <h3 className="text-lg font-medium text-purple-200">Meeting Summary</h3>
          <div className="text-xs text-purple-300 mt-1">Generated automatically based on the conversation</div>
        </div>
        
        {renderSummaryContent()}
      </div>
    );
  };
  
  if (!config) {
    // Apply lofi text color to loading state
    return <div className="min-h-screen flex items-center justify-center p-8 text-black/80" style={{ background: 'linear-gradient(to bottom, #ff9966, #ff5e62, #6B5B95, #45567d)' }}>Loading...</div>;
  }
  
  return (
    // Apply lofi background and styles to the main container
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 text-black/90 relative overflow-hidden" // Changed default text color
         style={{
           background: 'linear-gradient(to bottom, #ff9966, #ff5e62, #6B5B95, #45567d)'
         }}>
      {/* Decorative elements (kept as is) */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-yellow-300 blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-pink-400 blur-3xl"></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 rounded-full bg-purple-500 blur-3xl"></div>
      </div>

      {/* Main content area with backdrop blur for lofi effect */}
      <div className="max-w-4xl mx-auto relative z-10 w-full bg-black/20 backdrop-blur-md rounded-xl p-6 shadow-xl"> {/* Added container styling */}
        {/* Header section with connection status and controls */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-black">Live Transcription Room</h1> {/* Changed text color */}
          
          <div className="flex items-center space-x-3">
            {/* Status indicator with lofi styling - adjusted for dark theme */}
            <div className={`
              px-2 py-1 rounded-full text-sm font-medium
              ${status === 'connected' ? 'bg-green-800/60 text-green-200' : 
                status === 'error' ? 'bg-red-800/60 text-red-200' :
                status === 'connecting' ? 'bg-blue-800/60 text-blue-200' :
                'bg-yellow-800/60 text-yellow-200'}
            `}>
              {status}
            </div>
            
            {/* Mic button with lofi gradient */}
            <button
              onClick={toggleRecording}
              disabled={status !== 'connected'}
              className={`px-4 py-2 rounded-md text-white font-semibold transition-all duration-200 ${
                isRecording 
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 shadow-md' 
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md'
              } ${status !== 'connected' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isRecording ? 'Stop Mic' : 'Start Mic'}
            </button>
            
            {/* Leave button with lofi style */}
            <button
              onClick={leaveRoom}
              className="px-4 py-2 rounded-md text-gray-200 bg-gray-700/50 hover:bg-gray-600/70 transition-colors duration-200"
            >
              Leave Room
            </button>
          </div>
        </div>
        
        {/* Error and Debug Panel - Adjusted for dark theme */}
        {connectionError && (
          <div className="bg-red-900/50 text-red-200 p-3 rounded-md mb-4 border border-red-700/50"> {/* Adjusted colors */}
            {connectionError}
            {status === 'error' && connectionAttempts >= 3 && (
              <div className="mt-2">
                <button 
                  onClick={() => wsManagerRef.current?.connect()}
                  className="text-red-300 hover:text-red-100 underline" /* Adjusted colors */
                >
                  Retry connection
                </button>
                <span className="mx-2 text-red-400">|</span> {/* Adjusted colors */}
                <button 
                  onClick={toggleDebugMode}
                  className="text-red-300 hover:text-red-100 underline" /* Adjusted colors */
                >
                  {debugMode ? 'Hide' : 'Show'} connection details
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Debug Panel - Adjusted for dark theme */}
        {debugMode && (
          <div className="bg-gray-800/50 p-3 rounded-md mb-4 text-xs font-mono text-gray-300 border border-gray-600/50"> {/* Adjusted colors */}
            <h3 className="font-bold mb-2 text-gray-100">Connection Debug Info:</h3> {/* Adjusted colors */}
            <p>Server URL: {config?.serverUrl}</p>
            <p>Server Port: {config?.serverPort}</p>
            <p>Selected Microphone: {config?.selectedDeviceId}</p>
            <p>WebSocket Protocol: {config?.serverUrl.includes('localhost') ? 'ws://' : 'wss://'}</p>
            <p>Connection Status: {status}</p>
            <p>Connection Attempts: {connectionAttempts}</p>
            <p>Page Protocol: {typeof window !== 'undefined' ? window.location.protocol : 'unknown'}</p>
            {detectedLanguage && <p>Detected Language: {detectedLanguage}</p>}
            {availableLanguages.length > 0 && <p>Available Languages: {availableLanguages.join(', ')}</p>}
            <p className="font-semibold mt-2 text-gray-100">Total transcripts: {Object.keys(transcriptMap).length}</p> {/* Adjusted colors */}

            {/* Debug buttons - Adjusted colors */}
            <div className="flex flex-wrap gap-2 mt-2">
              <button 
                onClick={checkTranscripts}
                className="text-black bg-purple-600/70 hover:bg-purple-500/70 px-2 py-1 rounded text-xs"
              >
                Inspect Transcripts
              </button>
              
              <button 
                onClick={() => console.log('Transcript Map:', transcriptMap)}
                className="text-black bg-teal-600/70 hover:bg-teal-500/70 px-2 py-1 rounded text-xs"
              >
                Log Transcript Map
              </button>
            </div>
          </div>
        )}
        
        {/* Translation controls - Adjusted for dark theme */}
        <div className={`mb-4 bg-black/30 backdrop-blur-sm p-3 rounded-lg shadow-md translation-controls ${!hasTranslations && !availableLanguages.length ? 'hidden' : ''}`}> {/* Adjusted colors */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <label className="font-medium text-sm text-gray-300">Display mode:</label> {/* Adjusted colors */}
              <button 
                onClick={toggleAllTranslations}
                className="px-3 py-1 rounded-md text-sm bg-indigo-600/70 hover:bg-indigo-500/70 text-white transition-colors" /* Adjusted colors */
              >
                {showAllTranslations ? 'All Languages' : 'Single Language'}
              </button>
            </div>
            
            {!showAllTranslations && (
              <div className="flex items-center space-x-2">
                <label className="font-medium text-sm text-gray-300">Language:</label> {/* Adjusted colors */}
                <select 
                  value={selectedLanguage || ''}
                  onChange={(e) => changeLanguage(e.target.value)}
                  className="px-2 py-1 border border-gray-600/50 rounded text-sm bg-gray-700/50 text-white focus:ring-indigo-500 focus:border-indigo-500" /* Adjusted colors */
                >
                  {availableLanguages.map(lang => (
                    <option key={lang} value={lang} className="bg-gray-800 text-white">{lang}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
        
        {/* Tab navigation */}
        <div className="flex mb-4">
          <button
            onClick={() => setActiveTab('transcription')}
            className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors duration-200 ${
              activeTab === 'transcription'
                ? 'bg-black/30 backdrop-blur-sm text-white border-b-2 border-indigo-500'
                : 'bg-black/10 backdrop-blur-sm text-gray-400 hover:text-white'
            }`}
          >
            Live Transcription
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors duration-200 ${
              activeTab === 'summary'
                ? 'bg-black/30 backdrop-blur-sm text-white border-b-2 border-purple-500'
                : 'bg-black/10 backdrop-blur-sm text-gray-400 hover:text-white'
            }`}
          >
            Meeting Summary
          </button>
        </div>
        
        {/* Tab content */}
        {activeTab === 'transcription' ? (
          /* Global chronological transcription display - Adjusted for dark theme */
          <div className="bg-black/30 backdrop-blur-sm shadow-lg rounded-lg p-4 mb-6"> {/* Adjusted colors */}
            <h2 className="text-lg font-medium text-white/95 mb-3 border-b border-gray-600/50 pb-2">Transcription History</h2> {/* Adjusted colors */}
            
            {/* Scrollable transcript container - holds all transcripts chronologically */}
            <div 
              className="max-h-[500px] overflow-y-auto pr-2 pb-3 space-y-4" /* Added space-y-4 */
              style={{ scrollBehavior: 'smooth' }}
              ref={el => {
                // Auto-scroll to bottom when content changes
                if (el) {
                  el.scrollTop = el.scrollHeight;
                }
              }}
            >
              {/* Translations Section */}
              {displayTranslations.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-md font-medium text-gray-300 mb-2">Translations</h3> {/* Adjusted colors */}
                  {renderTranslations()}
                </div>
              )}
              
              {/* Conversation threads - grouped by speaker */}
              <div className="mt-6 space-y-6">
                {conversationDisplay.map((thread) => (
                  <div key={`thread-${thread.speaker}`} className="mb-4">
                    <div className="flex items-center mb-2">
                      <span className="text-sm font-medium text-gray-300">
                        {thread.speaker}
                      </span>
                      {thread.isUser && (
                        <span className="ml-2 px-1.5 py-0.5 bg-purple-800/50 text-purple-300 rounded-full text-xs">
                          You
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      {thread.segments.map((segment) => (
                        <TranscriptionBlock
                          key={segment.id}
                          transcript={segment}
                          showAllTranslations={showAllTranslations}
                          selectedLanguage={selectedLanguage}
                          detectedLanguage={detectedLanguage}
                          isUser={thread.isUser}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Latest Transcription Section - always at the bottom */}
              <div className="mt-4">
                <h3 className="text-md font-medium text-gray-300 mb-2">Latest Transcription</h3> {/* Adjusted colors */}
                {renderLatestTranscription()}
              </div>
              
              {/* Debug info for transcript IDs - Adjusted for dark theme */}
              {debugMode && (
                <div className="mt-4 text-xs text-gray-500 border-t border-gray-700/50 pt-2"> {/* Adjusted colors */}
                  <p>Global Transcript ID: {globalTranscriptId || 'None'}</p>
                  <p>Newest Transcript ID: {newestTranscriptId || 'None'}</p>
                  <p>Display Transcripts: {displayTranscripts.length}</p>
                  <p>Display Translations: {displayTranslations.length}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Meeting Summary Display */
          <div className="bg-black/30 backdrop-blur-sm shadow-lg rounded-lg p-4 mb-6">
            <h2 className="text-lg font-medium text-white/95 mb-3 border-b border-gray-600/50 pb-2">Meeting Summary</h2>
            
            <div className="max-h-[500px] overflow-y-auto pr-2 pb-3">
              {renderMeetingSummary()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to format time - kept as is
const formatTime = (timestamp: number): string => {
  // Convert to milliseconds if needed (if timestamp is in seconds)
  const timestampMs = timestamp > 10000000000 ? timestamp : timestamp * 1000;
  const date = new Date(timestampMs);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

// Helper functions for language styling - Adjusted for dark theme
const getLanguageBorderColor = (language: string): string => {
  const colorMap: Record<string, string> = {
    'en': 'border-blue-400',
    'es': 'border-yellow-400',
    'fr': 'border-indigo-400', 
    'de': 'border-amber-400',
    'zh': 'border-red-400',
    'ja': 'border-pink-400',
    'ko': 'border-purple-400',
    'ru': 'border-emerald-400',
    'ar': 'border-teal-400',
    'hi': 'border-orange-400',
    'pt': 'border-lime-400',
    'it': 'border-cyan-400',
    'vi': 'border-green-400'
  };
  return colorMap[language] || 'border-gray-400';
};

const getLanguageTextColor = (language: string): string => {
  const colorMap: Record<string, string> = {
    'en': 'text-blue-300',
    'es': 'text-yellow-300',
    'fr': 'text-indigo-300', 
    'de': 'text-amber-300',
    'zh': 'text-red-300',
    'ja': 'text-pink-300',
    'ko': 'text-purple-300',
    'ru': 'text-emerald-300',
    'ar': 'text-teal-300',
    'hi': 'text-orange-300',
    'pt': 'text-lime-300',
    'it': 'text-cyan-300',
    'vi': 'text-green-300'
  };
  return colorMap[language] || 'text-gray-300';
};
