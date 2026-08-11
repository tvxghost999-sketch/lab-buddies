import { useState, useEffect, useRef, useCallback } from 'react';
import { socketService } from '@/lib/socket';
import { VoiceParticipant } from '@/lib/types';
import { createAudioAnalyser } from '@/services/voice/audioAnalyser';

const isDev = process.env.NODE_ENV !== 'production';
const log = (...args: any[]) => {
  if (isDev) {
    console.log('[Voice Hook]', ...args);
  }
};

export type ConnectionQuality = 'connecting' | 'connected' | 'reconnecting' | 'failed';

export const useVoiceRoom = (pin: string, name: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState<VoiceParticipant[]>([]);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('connected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // React state for remote streams to trigger renders of <audio> tags
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

  // WebRTC / Audio Mutable Refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const iceCandidateQueuesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const audioAnalysersRef = useRef<Map<string, () => void>>(new Map());
  const iceServersRef = useRef<RTCIceServer[]>([
    { urls: 'stun:stun.l.google.com:19302' }
  ]);
  const maxParticipantsRef = useRef<number>(20);
  const isMutedRef = useRef(false);
  const isConnectedRef = useRef(false);

  // Sync mute state ref
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Sync connection state ref
  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  // Update local speaking state
  const handleSpeakingChange = useCallback((socketId: string, isSpeaking: boolean) => {
    setVoiceUsers((prev) =>
      prev.map((user) =>
        user.socketId === socketId ? { ...user, isSpeaking } : user
      )
    );
  }, []);

  // Clean up a specific peer connection
  const cleanupPeer = useCallback((socketId: string) => {
    log('Cleaning up peer connection for socket:', socketId);
    
    // Stop speaking analyser
    const stopAnalyser = audioAnalysersRef.current.get(socketId);
    if (stopAnalyser) {
      stopAnalyser();
      audioAnalysersRef.current.delete(socketId);
    }

    // Close PeerConnection
    const pc = peerConnectionsRef.current.get(socketId);
    if (pc) {
      try {
        pc.close();
      } catch (e) {
        log('Error closing peer connection:', e);
      }
      peerConnectionsRef.current.delete(socketId);
    }

    // Remove candidate queue
    iceCandidateQueuesRef.current.delete(socketId);

    // Remove remote stream
    setRemoteStreams((prev) => {
      const next = new Map(prev);
      next.delete(socketId);
      return next;
    });
  }, []);

  // Full clean up of all voice resources
  const cleanupAll = useCallback(() => {
    log('Cleaning up all voice resources');
    
    // Stop local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        log('Stopped local stream track:', track.kind);
      });
      localStreamRef.current = null;
    }

    // Clean up all audio analysers
    audioAnalysersRef.current.forEach((stopAnalyser) => stopAnalyser());
    audioAnalysersRef.current.clear();

    // Close and clean all peer connections
    peerConnectionsRef.current.forEach((pc, id) => {
      try {
        pc.close();
      } catch (e) {}
    });
    peerConnectionsRef.current.clear();
    iceCandidateQueuesRef.current.clear();

    // Reset stream states
    setRemoteStreams(new Map());
    setIsConnected(false);
    setIsConnecting(false);
    setConnectionQuality('connected');
  }, []);

  // Process any queued ICE candidates for a peer after remote description is set
  const processIceQueue = useCallback(async (socketId: string, pc: RTCPeerConnection) => {
    const queue = iceCandidateQueuesRef.current.get(socketId) || [];
    log(`Processing ${queue.length} queued ICE candidates for socket:`, socketId);
    
    for (const candidateInit of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidateInit));
      } catch (e) {
        log(`Error adding queued ICE candidate for ${socketId}:`, e);
      }
    }
    
    iceCandidateQueuesRef.current.delete(socketId);
  }, []);

  // Check browser capability before joining
  const checkCompatibility = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;

    if (!window.RTCPeerConnection) {
      setErrorMessage('Your browser does not support WebRTC Voice rooms.');
      return false;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage('Microphone access is not supported by your browser/protocol.');
      return false;
    }

    try {
      // Check if devices exist and if microphone is available
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasMic = devices.some((d) => d.kind === 'audioinput');
      if (!hasMic) {
        setErrorMessage('No microphone device found on your system.');
        return false;
      }
    } catch (e) {
      log('Enumerate devices error:', e);
    }

    return true;
  }, []);

  // Initialize a WebRTC PeerConnection for a specific remote user
  const initPeerConnection = useCallback((targetSocketId: string, isInitiator: boolean): RTCPeerConnection | null => {
    // Prevent duplicate peer connections
    if (peerConnectionsRef.current.has(targetSocketId)) {
      log('Duplicate connection prevented for socket:', targetSocketId);
      return peerConnectionsRef.current.get(targetSocketId) || null;
    }

    log(`Initializing PeerConnection for target: ${targetSocketId}, isInitiator: ${isInitiator}`);
    
    try {
      const pc = new RTCPeerConnection({
        iceServers: iceServersRef.current
      });

      peerConnectionsRef.current.set(targetSocketId, pc);

      // Add local stream tracks to PeerConnection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketService.sendVoiceIceCandidate(pin, targetSocketId, event.candidate);
        }
      };

      // Handle remote audio stream
      pc.ontrack = (event) => {
        log('Received remote track from socket:', targetSocketId);
        let remoteStream = event.streams[0];
        if (!remoteStream && event.track) {
          log('event.streams was empty. Creating new MediaStream from track.');
          remoteStream = new MediaStream([event.track]);
        }
        
        if (remoteStream) {
          // Store stream to trigger audio tags rendering
          setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.set(targetSocketId, remoteStream);
            return next;
          });

          // Setup speaking analyser for this remote stream
          const stopAnalyser = createAudioAnalyser(remoteStream, (isSpeaking) => {
            handleSpeakingChange(targetSocketId, isSpeaking);
          });
          
          audioAnalysersRef.current.set(targetSocketId, stopAnalyser);
        }
      };


      // Monitor connection state
      pc.onconnectionstatechange = () => {
        log(`Peer connection state with ${targetSocketId}:`, pc.connectionState);
        
        if (pc.connectionState === 'connected') {
          setConnectionQuality('connected');
        } else if (pc.connectionState === 'connecting') {
          setConnectionQuality('connecting');
        } else if (pc.connectionState === 'failed') {
          setConnectionQuality('failed');
          // Try to recover by cleaning up and triggering a renegotiation
          log(`Connection failed with ${targetSocketId}, rebuilding connection...`);
          cleanupPeer(targetSocketId);
          // If we are still in voice, renegotiate
          if (isConnectedRef.current) {
            initPeerConnection(targetSocketId, true);
          }
        } else if (
          pc.connectionState === 'disconnected' ||
          pc.connectionState === 'closed'
        ) {
          cleanupPeer(targetSocketId);
        }
      };

      return pc;
    } catch (e) {
      log('Failed to initialize RTCPeerConnection:', e);
      return null;
    }
  }, [pin, cleanupPeer, handleSpeakingChange]);

  // Connect to the voice room and prompt for permission
  const joinVoiceRoom = useCallback(async () => {
    setErrorMessage(null);
    setIsConnecting(true);

    const isCompatible = await checkCompatibility();
    if (!isCompatible) {
      setIsConnecting(false);
      return;
    }

    try {
      log('Requesting microphone permissions...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      log('Microphone access granted!');
      localStreamRef.current = stream;

      // Sync initial local mute state to tracks
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !isMutedRef.current;
      });

      // Bind local speaking analyser
      const stopLocalAnalyser = createAudioAnalyser(stream, (isSpeaking) => {
        const myId = socketService.getSocketId();
        if (myId) {
          handleSpeakingChange(myId, isSpeaking);
        }
      });
      audioAnalysersRef.current.set('local', stopLocalAnalyser);

      // Connect listeners
      socketService.onVoiceRoomUsers(async (existingUsers) => {
        log('Received existing voice users from server:', existingUsers.length);
        
        // Loop over each existing user and initiate a WebRTC connection
        for (const user of existingUsers) {
          const pc = initPeerConnection(user.socketId, true);
          if (pc) {
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socketService.sendVoiceOffer(pin, user.socketId, offer);
            } catch (err) {
              log(`Error creating WebRTC offer for ${user.socketId}:`, err);
            }
          }
        }
      });

      socketService.onVoiceOffer(async ({ initiatorSocketId, offer }) => {
        log('Received WebRTC offer from:', initiatorSocketId);
        const pc = initPeerConnection(initiatorSocketId, false);
        
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            
            // Process queued candidates
            await processIceQueue(initiatorSocketId, pc);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socketService.sendVoiceAnswer(pin, initiatorSocketId, answer);
          } catch (err) {
            log(`Error handling WebRTC offer from ${initiatorSocketId}:`, err);
          }
        }
      });

      socketService.onVoiceAnswer(async ({ responderSocketId, answer }) => {
        log('Received WebRTC answer from:', responderSocketId);
        const pc = peerConnectionsRef.current.get(responderSocketId);
        
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            // Process queued candidates
            await processIceQueue(responderSocketId, pc);
          } catch (err) {
            log(`Error setting remote answer description for ${responderSocketId}:`, err);
          }
        }
      });

      socketService.onVoiceIceCandidate(async ({ senderSocketId, candidate }) => {
        const pc = peerConnectionsRef.current.get(senderSocketId);
        if (pc && pc.remoteDescription) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            log(`Error adding ICE candidate from ${senderSocketId}:`, err);
          }
        } else {
          // Remote description is not set yet, queue the candidate
          if (!iceCandidateQueuesRef.current.has(senderSocketId)) {
            iceCandidateQueuesRef.current.set(senderSocketId, []);
          }
          iceCandidateQueuesRef.current.get(senderSocketId)!.push(candidate);
          log(`Queued ICE candidate from ${senderSocketId} (remoteDesc not set)`);
        }
      });

      socketService.onVoiceUserJoined(({ socketId, name, isMuted: muted }) => {
        log(`User ${name} (${socketId}) joined the voice room`);
        // The joiner initiates, so we just prepare to receive an offer.
      });

      socketService.onVoiceUserLeft(({ socketId }) => {
        log(`User with socket ID ${socketId} left the voice room`);
        cleanupPeer(socketId);
      });

      socketService.onVoiceRoomStateUpdated((users) => {
        log('Received updated voice room list:', users);
        setVoiceUsers(users);
      });

      socketService.onVoiceMute(({ socketId }) => {
        setVoiceUsers((prev) =>
          prev.map((u) => (u.socketId === socketId ? { ...u, isMuted: true } : u))
        );
      });

      socketService.onVoiceUnmute(({ socketId }) => {
        setVoiceUsers((prev) =>
          prev.map((u) => (u.socketId === socketId ? { ...u, isMuted: false } : u))
        );
      });

      socketService.onVoiceError(({ message }) => {
        setErrorMessage(message);
        cleanupAll();
      });

      // Retrieve dynamic server config (STUN servers / limit)
      socketService.getVoiceConfig((config) => {
        log('Loaded server voice configuration:', config);
        if (config.iceServers && config.iceServers.length > 0) {
          iceServersRef.current = config.iceServers;
        }
        maxParticipantsRef.current = config.maxParticipants;
        
        // Notify signaling server we are ready
        socketService.joinVoice(pin, name);
        setIsConnected(true);
        setIsConnecting(false);
      });

    } catch (e: any) {
      log('Permission or capture failed:', e);
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setErrorMessage('Microphone permission denied. Please allow microphone access in your browser settings.');
      } else {
        setErrorMessage(`Could not access microphone: ${e.message || 'Unknown error'}`);
      }
      setIsConnecting(false);
    }
  }, [pin, name, checkCompatibility, initPeerConnection, processIceQueue, cleanupPeer, cleanupAll, handleSpeakingChange]);

  // Leave voice room
  const leaveVoiceRoom = useCallback(() => {
    socketService.leaveVoice(pin);
    cleanupAll();
  }, [pin, cleanupAll]);

  // Toggle local mute
  const toggleMute = useCallback(() => {
    const nextMute = !isMuted;
    
    // Toggle track status
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMute;
      });
    }

    if (nextMute) {
      socketService.sendVoiceMute(pin);
    } else {
      socketService.sendVoiceUnmute(pin);
    }

    setIsMuted(nextMute);
  }, [pin, isMuted]);

  // Automatic Reconnection Handling
  useEffect(() => {
    const handleReconnect = () => {
      if (isConnectedRef.current) {
        log('Socket reconnected! Re-joining voice room...');
        setConnectionQuality('reconnecting');
        
        // Clear old connections to start fresh
        peerConnectionsRef.current.forEach((pc) => pc.close());
        peerConnectionsRef.current.clear();
        iceCandidateQueuesRef.current.clear();
        setRemoteStreams(new Map());

        // Notify server that we re-joined
        socketService.getVoiceConfig((config) => {
          if (config.iceServers && config.iceServers.length > 0) {
            iceServersRef.current = config.iceServers;
          }
          socketService.joinVoice(pin, name);
          setConnectionQuality('connected');
        });
      }
    };

    socketService.onSocketConnect(handleReconnect);
    
    return () => {
      socketService.offSocketConnect(handleReconnect);
    };
  }, [pin, name]);

  // Network interruption recovery
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      if (isConnectedRef.current) {
        log('Network restored. Reconnecting voice channel...');
        handleReconnectAction();
      }
    };

    const handleOffline = () => {
      if (isConnectedRef.current) {
        log('Network connection lost.');
        setConnectionQuality('reconnecting');
      }
    };

    const handleReconnectAction = () => {
      // Re-trigger join flow safely if network was recovered
      socketService.leaveVoice(pin);
      
      // Close connections
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      iceCandidateQueuesRef.current.clear();
      setRemoteStreams(new Map());

      socketService.joinVoice(pin, name);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pin, name]);

  // Tab close/cleanup listener
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleUnload = () => {
      if (isConnectedRef.current) {
        socketService.leaveVoice(pin);
      }
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [pin]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      cleanupAll();
    };
  }, [cleanupAll]);

  return {
    isConnected,
    isConnecting,
    isMuted,
    voiceUsers,
    connectionQuality,
    errorMessage,
    remoteStreams,
    joinVoiceRoom,
    leaveVoiceRoom,
    toggleMute
  };
};
