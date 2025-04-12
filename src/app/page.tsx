"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [serverUrl, setServerUrl] = useState('');
  const [serverPort, setServerPort] = useState('443');
  const [username, setUsername] = useState('tien');
  const [model, setModel] = useState('large-v3');
  const [useVad, setUseVad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Audio device selection state
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [loadingDevices, setLoadingDevices] = useState<boolean>(false);
  
  // Load available audio devices
  useEffect(() => {
    const loadAudioDevices = async () => {
      setLoadingDevices(true);
      try {
        // Request permission to access audio devices
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Get the list of devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        // Filter to only audio input devices
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        
        // Stop the temporary stream
        tempStream.getTracks().forEach(track => track.stop());
        
        setAudioDevices(audioInputs);
        
        // Select first device by default if none selected
        if (audioInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(audioInputs[0].deviceId);
        }
      } catch (error) {
        console.error("Error loading audio devices:", error);
        setError("Failed to access microphone. Please check your browser permissions.");
      } finally {
        setLoadingDevices(false);
      }
    };
    
    loadAudioDevices();
    
    // Set up device change listener
    navigator.mediaDevices.addEventListener('devicechange', loadAudioDevices);
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', loadAudioDevices);
    };
  }, []);

  // Function to refresh the device list
  const refreshDeviceList = async () => {
    setLoadingDevices(true);
    try {
      // Request permission to access audio devices
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Get the list of devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      // Filter to only audio input devices
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      // Stop the temporary stream
      tempStream.getTracks().forEach(track => track.stop());
      
      setAudioDevices(audioInputs);
    } catch (error) {
      console.error("Error refreshing device list:", error);
      setError("Failed to access audio devices. Please check your browser permissions.");
    } finally {
      setLoadingDevices(false);
    }
  };
  
  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    if (!serverUrl.trim()) {
      setError("Please enter a server URL");
      return;
    }
    
    if (!username.trim()) {
      setError("Please enter your name");
      return;
    }
    
    if (!selectedDeviceId) {
      setError("Please select a microphone");
      return;
    }
    
    // Clear any previous errors
    setError(null);
    
    // Store config in sessionStorage
    const config = {
      serverUrl: serverUrl.trim(),
      serverPort: serverPort.trim(),
      username: username.trim(),
      model,
      useVad,
      selectedDeviceId // Add selected device ID to config
    };
    
    console.log("Storing config:", config);
    sessionStorage.setItem('sttConfig', JSON.stringify(config));
    
    // Navigate to room page
    router.push('/room');
  };
  
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 text-black relative overflow-hidden"
         style={{
           background: 'linear-gradient(to bottom, #ff9966, #ff5e62, #6B5B95, #45567d)'
         }}>
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-yellow-300 blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-pink-400 blur-3xl"></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 rounded-full bg-purple-500 blur-3xl"></div>
      </div>
      
      <div className="max-w-md mx-auto relative z-10">
        <h1 className="text-center text-4xl font-bold mb-8 text-black drop-shadow-lg">
          Meeting Artificial Intelligence (M.A.I)
        </h1>

        
        {error && (
          <div className="bg-red-100 text-red-800 p-3 rounded-md mb-4 shadow-lg">
            {error}
          </div>
        )}
        
        <form onSubmit={handleJoin} className="backdrop-blur-md bg-white/10 p-8 rounded-lg shadow-lg border border-white/20">
          <div className="mb-5">
            <label className="block text-sm font-medium mb-1 text-black">Server URL</label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="w-full p-3 bg-white/20 border border-white/30 rounded-md text-black placeholder-black/70 focus:outline-none focus:ring-2 focus:ring-pink-400"
              placeholder="example: your-tunnel.trycloudflare.com"
              required
            />
            <p className="text-xs text-black/80 mt-1">
              Enter your Cloudflare tunnel URL without any protocol (no wss:// or https://)
            </p>
          </div>
          
          <div className="mb-5">
            <label className="block text-sm font-medium mb-1 text-black">Server Port</label>
            <input
              type="text"
              value={serverPort}
              onChange={(e) => setServerPort(e.target.value)}
              className="w-full p-3 bg-white/20 border border-white/30 rounded-md text-black placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-pink-400"
              required
            />
            <p className="text-xs text-black/80 mt-1">
              For Cloudflare tunnels, use port 443 (default HTTPS port)
            </p>
          </div>
          
          <div className="mb-5">
            <label className="block text-sm font-medium mb-1 text-black">Your Name</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 bg-white/20 border border-white/30 rounded-md text-black placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-pink-400"
              required
            />
          </div>
          
          {/* Microphone Selection */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-black">Microphone</label>
              <button
                type="button"
                onClick={refreshDeviceList}
                disabled={loadingDevices}
                className={`text-xs px-3 py-1.5 rounded-full ${
                  loadingDevices ? 'bg-purple-400/50' : 'bg-purple-500/70 hover:bg-purple-400/80'
                } text-black transition-colors`}
              >
                {loadingDevices ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            <select
              value={selectedDeviceId || ''}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              disabled={loadingDevices}
              className={`w-full p-3 bg-white/20 border border-white/30 rounded-md text-black ${loadingDevices ? 'opacity-50' : ''} focus:outline-none focus:ring-2 focus:ring-pink-400`}
              required
            >
              {audioDevices.length === 0 && (
                <option value="">No microphones found</option>
              )}
              {audioDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone (${device.deviceId.substring(0, 5)}...)`}
                </option>
              ))}
            </select>
            <p className="text-xs text-black/80 mt-1">
              Select the microphone you want to use
            </p>
          </div>
          
          <div className="mb-5">
            <label className="block text-sm font-medium mb-1 text-black">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full p-3 bg-white/20 border border-white/30 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-pink-400"
            >
              <option value="large-v2">Large V2</option>
              <option value="large-v3">Large V3</option>
              <option value="medium">Medium</option>
              <option value="small">Small</option>
              <option value="base">Base</option>
            </select>
            <p className="text-xs text-black/80 mt-1">
              Select the same model that your server is using
            </p>
          </div>
          
          <div className="mb-6 flex items-center">
            <input
              type="checkbox"
              checked={useVad}
              onChange={(e) => setUseVad(e.target.checked)}
              className="w-5 h-5 mr-2 accent-pink-500"
              id="vad-checkbox"
            />
            <label htmlFor="vad-checkbox" className="text-sm text-black">Use Voice Activity Detection</label>
          </div>
          
          <button
            type="submit"
            className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 to-purple-600 text-black rounded-md hover:from-pink-600 hover:to-purple-700 transition-colors shadow-lg"
          >
            Join Room
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-black/80">
          Make sure your server is running and accessible via Cloudflare tunnel
        </div>
      </div>
    </div>
  );
}
