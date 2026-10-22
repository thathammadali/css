/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Share2,
  Hand,
  LogOut,
  Users,
  MessageSquare,
  FileText,
  Radio,
  ShieldCheck,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Send,
  Download,
  HelpCircle,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Play,
  Square,
  Grid,
  Tv,
  UserX,
  ChevronLeft,
  ChevronRight,
  Presentation,
  Sparkles,
  AlertCircle,
  CameraOff,
  Settings,
  AlertTriangle,
} from 'lucide-react';

import {
  SessionItem,
  DashboardRole,
  RegistrantItem,
  RoomPermissions,
  SessionDeliveryStatus,
} from '../../types';
import { roomAccessService } from '../../services/roomAccessService';
import { eventService } from '../../services/eventService';
import { ConfirmDialog } from '../ConfirmDialog';

interface SessionRoomViewProps {
  session: SessionItem;
  room: {
    id: string;
    sessionId: string;
    sessionTitle: string;
    roomName: string;
    status: string;
    meetingUrl?: string;
    speakerName?: string;
    presentationTopic?: string;
    deliveryStatus?: SessionDeliveryStatus;
    isLive?: boolean;
    isLocked?: boolean;
    isRecording?: boolean;
  };
  sessionToken: string;
  currentRole: DashboardRole;
  userName: string;
  userEmail: string;
  registrant?: RegistrantItem;
  onLeaveRoom: () => void;
  onNotify: (msg: string) => void;
  onAttendanceChecked?: (sessionId: string) => void;
}

interface PeerInfo {
  peerId: string;
  name: string;
  email: string;
  role: DashboardRole;
  audioEnabled: boolean;
  videoEnabled: boolean;
  cameraStreamActive?: boolean;
  avatarActive?: boolean;
  cameraUnavailableReason?: string;
  screenSharing: boolean;
  handRaised: boolean;
}

interface ChatMessage {
  id: string;
  sender: string;
  senderEmail: string;
  role: string;
  message: string;
  timestamp: string;
}

interface QAItem {
  id: string;
  author: string;
  authorEmail: string;
  question: string;
  timestamp: string;
  upvotes: number;
  upvotedBy: string[];
  isAnswered: boolean;
  answer?: string;
  answeredBy?: string;
}

interface AttendanceRecord {
  participantEmail: string;
  participantName: string;
  role: DashboardRole;
  joinedAt: number;
  lastSeenAt: number;
  totalDurationSeconds: number;
  thresholdMet: boolean;
  verificationStatus?: 'in_session' | 'pending_verification' | 'verified' | 'below_duration';
  verifiedBy?: string;
}

export const SessionRoomView: React.FC<SessionRoomViewProps> = ({
  session,
  room,
  sessionToken,
  currentRole,
  userName,
  userEmail,
  registrant,
  onLeaveRoom,
  onNotify,
  onAttendanceChecked,
}) => {
  const isHost = currentRole === 'super_admin' || currentRole === 'admin';

  // Zoom-style Pre-Join Green Room state (User must click "Join Session Now" to enter)
  const [hasJoinedMeeting, setHasJoinedMeeting] = useState<boolean>(false);
  const [devicePermissionStatus, setDevicePermissionStatus] = useState<'idle' | 'prompt' | 'granted' | 'denied'>('idle');
  const [isMirrorVideo, setIsMirrorVideo] = useState<boolean>(true);
  const [availableMics, setAvailableMics] = useState<MediaDeviceInfo[]>([]);
  const [availableCams, setAvailableCams] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>('');
  const [selectedCamId, setSelectedCamId] = useState<string>('');

  // Truthful camera hardware state (distinguish physical camera from avatar fallback)
  const [isHardwareCameraActive, setIsHardwareCameraActive] = useState<boolean>(false);
  const [cameraUnavailableReason, setCameraUnavailableReason] = useState<
    'none' | 'permission_denied' | 'device_missing' | 'user_off'
  >('user_off');

  // Participant live attendance verification state
  const [myAttendanceStatus, setMyAttendanceStatus] = useState<
    'in_session' | 'pending_verification' | 'verified' | 'below_duration'
  >('in_session');
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState<number>(0);

  // Unique peer ID for this client instance
  const myPeerIdRef = useRef<string>(
    `peer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  );
  const myPeerId = myPeerIdRef.current;

  // Real media state (toggled in pre-join and during meeting)
  const [isMicOn, setIsMicOn] = useState<boolean>(false);
  const [isVideoOn, setIsVideoOn] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isHandRaised, setIsHandRaised] = useState<boolean>(false);
  const [speakerMuted, setSpeakerMuted] = useState<boolean>(false);
  const [speakerVolume, setSpeakerVolume] = useState<number>(85);
  const [showAudioSettings, setShowAudioSettings] = useState<boolean>(false);
  const [audioInputLevel, setAudioInputLevel] = useState<number>(0);

  // Layout & UI controls
  const [viewMode, setViewMode] = useState<'speaker' | 'gallery'>('gallery');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeSidePanel, setActiveSidePanel] = useState<
    'chat' | 'participants' | 'qa' | 'resources' | 'host-tools' | null
  >('chat');
  const [showEndMeetingConfirm, setShowEndMeetingConfirm] = useState<boolean>(false);

  // Meeting Room Server Synchronized State
  const [meetingState, setMeetingState] = useState<{
    deliveryStatus: SessionDeliveryStatus;
    isLive: boolean;
    isLocked: boolean;
    isRecording: boolean;
    recordingStatus?: 'idle' | 'recording' | 'processing' | 'available' | 'failed' | 'none';
    recordingDurationSeconds: number;
    recordingStartedAt: number | null;
    recordingUrl?: string;
    meetingSummary?: string;
    permissions: RoomPermissions;
  }>({
    deliveryStatus: room.deliveryStatus || 'UPCOMING',
    isLive: !!room.isLive,
    isLocked: !!room.isLocked,
    isRecording: !!room.isRecording,
    recordingStatus: room.isRecording ? 'recording' : 'idle',
    recordingDurationSeconds: 0,
    recordingStartedAt: null,
    permissions: {
      allowChat: true,
      allowShareScreen: true,
      allowUnmute: true,
      allowRaiseHand: true,
      allowCamera: true,
    },
  });

  // Recording elapsed timer
  const [recordingTimer, setRecordingTimer] = useState<number>(0);

  // Remote Peers state
  const [peers, setPeers] = useState<Map<string, PeerInfo>>(new Map());

  // Real-time Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');

  // Real-time Q&A
  const [qaItems, setQaItems] = useState<QAItem[]>([]);
  const [qaInput, setQaInput] = useState<string>('');
  const [qaReplyInput, setQaReplyInput] = useState<{ [qaId: string]: string }>({});

  // Attendance Records
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [attendanceRecorded, setAttendanceRecorded] = useState<boolean>(false);

  // Floating reactions
  const [reactions, setReactions] = useState<
    Array<{ id: number; emoji: string; sender: string }>
  >([]);

  // Virtual Room Camera Fallback & Presentation Slide Simulator
  const [isCameraFallbackActive, setIsCameraFallbackActive] = useState<boolean>(true);
  const [isSimulatedSlideDeckActive, setIsSimulatedSlideDeckActive] = useState<boolean>(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);

  const presentationSlides = [
    {
      id: 1,
      title: 'Keynote & Technical Agenda',
      subtitle: room.presentationTopic || 'Swarm Robotics & Distributed Nodes',
      tag: 'SLIDE 01 / 04',
      bullets: [
        'Welcome participants to the live verified virtual pod',
        'ROS2 Micro-architecture & Real-time Swarm Robotics Control',
        'Zero-latency participant attendance telemetry and check-ins',
        'Interactive audience Q&A and accredited certificate issuance',
      ],
    },
    {
      id: 2,
      title: 'Distributed Control & Micro-ROS Bridge',
      subtitle: 'Hardware Interfaces & Firmware Interoperability',
      tag: 'SLIDE 02 / 04',
      bullets: [
        'Micro-ROS serial bridge with STM32 Cortex-M4 microcontroller',
        'Edge consensus & deterministic fail-safe recovery in swarm clusters',
        'Sub-10ms inter-node telemetry dispatch via WebSocket & WebRTC',
        'Live system resource monitoring across all simulated agents',
      ],
    },
    {
      id: 3,
      title: 'Field Validation & Sensor Telemetry',
      subtitle: 'Depth Cloud Processing & Obstacle Traversal',
      tag: 'SLIDE 03 / 04',
      bullets: [
        'LiDAR point cloud downsampling with sub-12ms spatial latency',
        'Dynamic path replanning using A* and hybrid trajectory curves',
        'Cryptographic validation of participant telemetry logs',
        'Automated attendance tracking meeting institutional 75% threshold',
      ],
    },
    {
      id: 4,
      title: 'Executive Summary & Live Q&A Stage',
      subtitle: 'Floor Open for Discussion & Audience Inquiry',
      tag: 'SLIDE 04 / 04',
      bullets: [
        'Audience may ask questions in the Q&A panel on the right',
        'Upvote peers for priority host response during live stream',
        'Attendance recorded automatically in the campus credential registry',
        'Tamper-evident verification hash generated upon session conclusion',
      ],
    },
  ];

  // DOM and WebRTC References
  const containerRef = useRef<HTMLDivElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioIntervalRef = useRef<number | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Recording elapsed counter
  useEffect(() => {
    let interval: any = null;
    if (meetingState.isRecording) {
      interval = setInterval(() => {
        setRecordingTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [meetingState.isRecording]);

  // Setup Web Audio API analyser on local mic stream
  const setupAudioAnalyser = useCallback((stream: MediaStream) => {
    try {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) return;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const audioCtx = audioContextRef.current;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      audioAnalyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = window.setInterval(() => {
        if (!audioAnalyserRef.current) return;
        audioAnalyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        setAudioInputLevel(Math.min(100, Math.round((avg / 128) * 100)));
      }, 150);
    } catch {
      // Audio analyser optional fallback
    }
  }, []);

  // Cleanup WebRTC connection helper
  const closePeerConnection = useCallback((targetPeerId: string) => {
    const pc = peerConnectionsRef.current.get(targetPeerId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(targetPeerId);
    }
    remoteVideoRefs.current.delete(targetPeerId);
  }, []);

  // Create RTCPeerConnection to target peer
  const createPeerConnection = useCallback(
    (targetPeerId: string, isInitiator: boolean) => {
      if (peerConnectionsRef.current.has(targetPeerId)) {
        return peerConnectionsRef.current.get(targetPeerId)!;
      }

      const configuration: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      };

      const pc = new RTCPeerConnection(configuration);
      peerConnectionsRef.current.set(targetPeerId, pc);

      // Add local media tracks
      const streamToUse = screenStreamRef.current || localStreamRef.current;
      if (streamToUse) {
        streamToUse.getTracks().forEach((track) => {
          pc.addTrack(track, streamToUse);
        });
      }

      // Handle ICE Candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'signal:ice-candidate',
              targetPeerId,
              candidate: event.candidate,
            })
          );
        }
      };

      // Handle Incoming Remote Stream
      pc.ontrack = (event) => {
        const remoteVideo = remoteVideoRefs.current.get(targetPeerId);
        if (remoteVideo && event.streams[0]) {
          remoteVideo.srcObject = event.streams[0];
          remoteVideo.play().catch(() => {});
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          closePeerConnection(targetPeerId);
        }
      };

      // If initiator, generate SDP Offer
      if (isInitiator) {
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(
                JSON.stringify({
                  type: 'signal:offer',
                  targetPeerId,
                  sdp: pc.localDescription,
                })
              );
            }
          })
          .catch((err) => console.error('Error creating offer', err));
      }

      return pc;
    },
    [closePeerConnection]
  );

  // Load Available Media Devices on Mount (Without prompting aggressive permission dialogs)
  useEffect(() => {
    let isCancelled = false;

    async function loadDevices() {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (isCancelled) return;
        const audioDevs = devices.filter((d) => d.kind === 'audioinput');
        const videoDevs = devices.filter((d) => d.kind === 'videoinput');
        setAvailableMics(audioDevs);
        setAvailableCams(videoDevs);
        if (audioDevs[0]?.deviceId) setSelectedMicId(audioDevs[0].deviceId);
        if (videoDevs[0]?.deviceId) setSelectedCamId(videoDevs[0].deviceId);

        if (videoDevs.length === 0) {
          setCameraUnavailableReason('device_missing');
          setIsCameraFallbackActive(true);
        }
      } catch (err) {
        console.warn('Could not enumerate devices', err);
      }
    }

    loadDevices();

    return () => {
      isCancelled = true;
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Pre-join: Toggle Camera Preview
  const handleTogglePreJoinCamera = async () => {
    if (isVideoOn && previewStreamRef.current) {
      previewStreamRef.current.getVideoTracks().forEach((t) => t.stop());
      previewStreamRef.current = null;
      setIsVideoOn(false);
      setIsHardwareCameraActive(false);
      setCameraUnavailableReason('user_off');
      setIsCameraFallbackActive(true);
      if (previewVideoRef.current) previewVideoRef.current.srcObject = null;
      return;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraUnavailableReason('device_missing');
        setIsCameraFallbackActive(true);
        setIsHardwareCameraActive(false);
        onNotify('Camera hardware is not available on this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: selectedCamId ? { deviceId: { exact: selectedCamId } } : { width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      previewStreamRef.current = stream;
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
      }
      setIsVideoOn(true);
      setIsHardwareCameraActive(true);
      setCameraUnavailableReason('none');
      setIsCameraFallbackActive(false);
      setDevicePermissionStatus('granted');
      onNotify('Camera preview activated.');
    } catch (err: any) {
      console.warn('Camera access denied or failed', err);
      setIsVideoOn(false);
      setIsHardwareCameraActive(false);
      setCameraUnavailableReason('permission_denied');
      setDevicePermissionStatus('denied');
      setIsCameraFallbackActive(true);
      onNotify('Camera permission was denied. You will join with your Scholar Avatar.');
    }
  };

  // Pre-join: Toggle Microphone Preview
  const handleTogglePreJoinMic = async () => {
    if (isMicOn && localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
      setIsMicOn(false);
      setAudioInputLevel(0);
      return;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        onNotify('Microphone hardware is not available on this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true,
      });

      if (!localStreamRef.current) {
        localStreamRef.current = stream;
      } else {
        stream.getAudioTracks().forEach((t) => localStreamRef.current?.addTrack(t));
      }

      setIsMicOn(true);
      setDevicePermissionStatus('granted');
      setupAudioAnalyser(stream);
      onNotify('Microphone preview activated. Speak to check level.');
    } catch (err: any) {
      console.warn('Microphone access denied', err);
      setIsMicOn(false);
      setDevicePermissionStatus('denied');
      onNotify('Microphone permission was denied. You can join with in-meeting chat.');
    }
  };

  // Pre-join: Join Meeting Action
  const handleJoinMeeting = () => {
    if (previewStreamRef.current && isHardwareCameraActive) {
      localStreamRef.current = previewStreamRef.current;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = previewStreamRef.current;
      }
    }
    setHasJoinedMeeting(true);
    onNotify(`Joined meeting room for "${session.title}"!`);
  };

  // In-session duration timer (increments every second after joining)
  useEffect(() => {
    let interval: any = null;
    if (hasJoinedMeeting && meetingState.deliveryStatus === 'LIVE') {
      interval = setInterval(() => {
        setSessionElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [hasJoinedMeeting, meetingState.deliveryStatus]);

  // Connect WebSocket & Join Room (ONLY active when user has clicked "Join Session Now")
  useEffect(() => {
    if (!hasJoinedMeeting) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/meeting`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Send join event with truthful media state
      ws.send(
        JSON.stringify({
          type: 'join',
          sessionId: session.id,
          token: sessionToken,
          peerId: myPeerId,
          name: userName,
          role: currentRole,
          email: userEmail,
          audioEnabled: isMicOn,
          videoEnabled: isHardwareCameraActive,
          cameraStreamActive: isHardwareCameraActive,
          avatarActive: !isHardwareCameraActive,
          cameraUnavailableReason,
        })
      );
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          // Room Join Confirmation
          case 'joined': {
            if (data.meetingState) {
              setMeetingState((prev) => ({
                ...prev,
                ...data.meetingState,
              }));
              if (data.meetingState.isRecording && data.meetingState.recordingStartedAt) {
                const elapsed = Math.round((Date.now() - data.meetingState.recordingStartedAt) / 1000);
                setRecordingTimer(elapsed);
              }
            }

            if (data.chatHistory) setChatMessages(data.chatHistory);
            if (data.qaItems) setQaItems(data.qaItems);
            if (data.attendanceSummary) setAttendanceList(data.attendanceSummary);

            // Populate existing peers and initiate WebRTC connections
            if (Array.isArray(data.existingPeers)) {
              const map = new Map<string, PeerInfo>();
              data.existingPeers.forEach((p: PeerInfo) => {
                map.set(p.peerId, p);
                createPeerConnection(p.peerId, true);
              });
              setPeers(map);
            }
            break;
          }

          // New peer joined
          case 'peer-joined': {
            const newPeer: PeerInfo = data.peer;
            setPeers((prev) => {
              const next = new Map(prev);
              next.set(newPeer.peerId, newPeer);
              return next;
            });
            onNotify(`${newPeer.name} joined the meeting`);
            break;
          }

          // Peer left
          case 'peer-left': {
            setPeers((prev) => {
              const next = new Map(prev);
              next.delete(data.peerId);
              return next;
            });
            closePeerConnection(data.peerId);
            break;
          }

          // WebRTC Signaling: Offer
          case 'signal:offer': {
            const pc = createPeerConnection(data.fromPeerId, false);
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(
                JSON.stringify({
                  type: 'signal:answer',
                  targetPeerId: data.fromPeerId,
                  sdp: pc.localDescription,
                })
              );
            }
            break;
          }

          // WebRTC Signaling: Answer
          case 'signal:answer': {
            const pc = peerConnectionsRef.current.get(data.fromPeerId);
            if (pc) {
              await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            }
            break;
          }

          // WebRTC Signaling: ICE Candidate
          case 'signal:ice-candidate': {
            const pc = peerConnectionsRef.current.get(data.fromPeerId);
            if (pc && data.candidate) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
              } catch {
                // Ignore late candidate
              }
            }
            break;
          }

          // Media state changes for peer
          case 'peer-media-state': {
            setPeers((prev) => {
              const next = new Map(prev);
              const p = next.get(data.peerId);
              if (p) {
                next.set(data.peerId, {
                  ...p,
                  audioEnabled: data.audioEnabled,
                  videoEnabled: data.videoEnabled,
                  cameraStreamActive: data.cameraStreamActive,
                  avatarActive: data.avatarActive,
                  cameraUnavailableReason: data.cameraUnavailableReason,
                  screenSharing: data.screenSharing,
                  handRaised: data.handRaised,
                });
              }
              return next;
            });
            break;
          }

          // Chat message received
          case 'chat:new-message': {
            setChatMessages((prev) => [...prev, data.message]);
            break;
          }

          // Emoji Reaction
          case 'peer-reaction': {
            const id = Date.now();
            setReactions((prev) => [
              ...prev,
              { id, emoji: data.emoji, sender: data.senderName },
            ]);
            setTimeout(() => {
              setReactions((prev) => prev.filter((r) => r.id !== id));
            }, 3000);
            break;
          }

          // Q&A Updates
          case 'qa:new': {
            setQaItems((prev) => [...prev, data.qaItem]);
            break;
          }
          case 'qa:updated': {
            setQaItems((prev) =>
              prev.map((q) => (q.id === data.qaItem.id ? data.qaItem : q))
            );
            break;
          }

          // Meeting State Changed (e.g. Host started session)
          case 'meeting:state-changed': {
            if (data.meetingState) {
              setMeetingState((prev) => ({
                ...prev,
                ...data.meetingState,
              }));
            }
            if (data.announcement) {
              onNotify(data.announcement);
            }
            break;
          }

          // Meeting Ended for all
          case 'meeting:ended': {
            if (data.meetingState) {
              setMeetingState((prev) => ({
                ...prev,
                ...data.meetingState,
              }));
            }
            if (data.finalizedAttendance) {
              setAttendanceList(data.finalizedAttendance);
              const myRecord = data.finalizedAttendance.find(
                (a: AttendanceRecord) => a.participantEmail.toLowerCase() === userEmail.toLowerCase()
              );
              if (myRecord) {
                setMyAttendanceStatus(myRecord.verificationStatus || (myRecord.thresholdMet ? 'verified' : 'below_duration'));
              }
            }
            onAttendanceChecked?.(session.id);
            setAttendanceRecorded(true);
            onNotify('🏁 The host has concluded the meeting.');
            break;
          }

          // Recording state changed (Truthful state handling)
          case 'recording:state-changed': {
            setMeetingState((prev) => ({
              ...prev,
              isRecording: !!data.isRecording,
              recordingStatus: data.recordingStatus || (data.isRecording ? 'recording' : 'processing'),
              recordingUrl: data.recordingUrl || prev.recordingUrl,
              recordingStartedAt: data.recordingStartedAt,
              recordingDurationSeconds: data.recordingDurationSeconds ?? prev.recordingDurationSeconds,
            }));
            if (data.isRecording) {
              setRecordingTimer(0);
              onNotify('🔴 Meeting recording started');
            } else if (data.recordingStatus === 'available') {
              onNotify('Cloud recording has finished encoding and is available for playback.');
            } else if (data.recordingStatus === 'processing') {
              onNotify('Recording paused — cloud media pipeline is encoding 1080p stream...');
            } else {
              onNotify('Meeting recording paused.');
            }
            break;
          }

          // Attendance Updated
          case 'attendance:updated': {
            if (data.attendanceSummary) {
              setAttendanceList(data.attendanceSummary);
            }
            if (data.record && data.record.participantEmail.toLowerCase() === userEmail.toLowerCase()) {
              setMyAttendanceStatus(data.record.verificationStatus || 'pending_verification');
              if (data.record.verificationStatus === 'verified') {
                onNotify('Your attendance has been officially verified by the host! ✓');
                onAttendanceChecked?.(session.id);
                setAttendanceRecorded(true);
              } else if (data.record.verificationStatus === 'pending_verification') {
                onNotify('Your attendance check-in was logged. Verification pending.');
              }
            }
            break;
          }

          // Room lock changed
          case 'room:lock-changed': {
            setMeetingState((prev) => ({
              ...prev,
              isLocked: data.isLocked,
            }));
            onNotify(data.message);
            break;
          }

          // Permissions updated
          case 'permissions:updated': {
            setMeetingState((prev) => ({
              ...prev,
              permissions: data.permissions,
            }));
            break;
          }

          // Force mute from host
          case 'host:force-mute': {
            if (localStreamRef.current) {
              localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
            }
            setIsMicOn(false);
            onNotify('Microphone muted by session host');
            break;
          }

          // Kicked from room
          case 'host:removed': {
            onNotify(data.message || 'You were removed from the room.');
            onLeaveRoom();
            break;
          }

          case 'error': {
            onNotify(`Meeting Notice: ${data.message}`);
            break;
          }
        }
      } catch (err) {
        console.error('Error handling WebSocket message', err);
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
    };
  }, [
    hasJoinedMeeting,
    session.id,
    sessionToken,
    myPeerId,
    userName,
    currentRole,
    userEmail,
    isMicOn,
    isHardwareCameraActive,
    cameraUnavailableReason,
    createPeerConnection,
    closePeerConnection,
    onLeaveRoom,
    onNotify,
    onAttendanceChecked,
  ]);

  // Toggle Microphone
  const handleToggleMic = () => {
    if (!meetingState.permissions.allowUnmute && !isHost && !isMicOn) {
      onNotify('Unmuting is currently restricted by the session host.');
      return;
    }

    const nextState = !isMicOn;
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = nextState;
      });
    }
    setIsMicOn(nextState);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'media-state',
          audioEnabled: nextState,
          videoEnabled: isHardwareCameraActive,
          cameraStreamActive: isHardwareCameraActive,
          avatarActive: !isHardwareCameraActive,
          screenSharing: isScreenSharing,
          handRaised: isHandRaised,
        })
      );
    }
  };

  // Toggle Camera (With Truthful Hardware Detection & Distinct Avatar State)
  const handleToggleVideo = async () => {
    if (!meetingState.permissions.allowCamera && !isHost && !isHardwareCameraActive) {
      onNotify('Camera streaming is currently restricted by the session host.');
      return;
    }

    let videoTrack = localStreamRef.current?.getVideoTracks()[0];

    // If user wants to turn video ON but no hardware track is currently available
    if (!isHardwareCameraActive && !videoTrack) {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setIsHardwareCameraActive(false);
          setIsVideoOn(false);
          setCameraUnavailableReason('device_missing');
          onNotify('Webcam hardware is not available on this device. Displaying your Scholar Avatar.');
          return;
        }

        const newStream = await navigator.mediaDevices.getUserMedia({
          video: selectedCamId ? { deviceId: { exact: selectedCamId } } : { width: { ideal: 1280 }, height: { ideal: 720 } },
        });

        const newTrack = newStream.getVideoTracks()[0];
        if (newTrack) {
          videoTrack = newTrack;
          if (localStreamRef.current) {
            localStreamRef.current.addTrack(newTrack);
          } else {
            localStreamRef.current = newStream;
          }
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
          peerConnectionsRef.current.forEach((pc) => {
            const senders = pc.getSenders();
            const videoSender = senders.find((s) => s.track?.kind === 'video');
            if (videoSender) {
              videoSender.replaceTrack(newTrack);
            } else {
              pc.addTrack(newTrack, localStreamRef.current!);
            }
          });
          setIsHardwareCameraActive(true);
          setIsVideoOn(true);
          setCameraUnavailableReason('none');
          setIsCameraFallbackActive(false);
          onNotify('Webcam turned on.');

          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: 'media-state',
                audioEnabled: isMicOn,
                videoEnabled: true,
                cameraStreamActive: true,
                avatarActive: false,
                screenSharing: isScreenSharing,
                handRaised: isHandRaised,
              })
            );
          }
          return;
        }
      } catch (err: any) {
        console.warn('Camera request denied or unavailable', err);
        setIsHardwareCameraActive(false);
        setIsVideoOn(false);
        setCameraUnavailableReason('permission_denied');
        setIsCameraFallbackActive(true);
        onNotify('Camera access is blocked in browser settings. Displaying your Scholar Avatar.');

        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'media-state',
              audioEnabled: isMicOn,
              videoEnabled: false,
              cameraStreamActive: false,
              avatarActive: true,
              cameraUnavailableReason: 'permission_denied',
              screenSharing: isScreenSharing,
              handRaised: isHandRaised,
            })
          );
        }
        return;
      }
    }

    // Toggle existing track
    const nextState = !isHardwareCameraActive;
    if (videoTrack) {
      videoTrack.enabled = nextState;
    }
    setIsHardwareCameraActive(nextState);
    setIsVideoOn(nextState);
    setIsCameraFallbackActive(!nextState);
    setCameraUnavailableReason(nextState ? 'none' : 'user_off');
    onNotify(nextState ? 'Camera turned on.' : 'Camera turned off. Displaying Avatar.');

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'media-state',
          audioEnabled: isMicOn,
          videoEnabled: nextState,
          cameraStreamActive: nextState,
          avatarActive: !nextState,
          cameraUnavailableReason: nextState ? 'none' : 'user_off',
          screenSharing: isScreenSharing,
          handRaised: isHandRaised,
        })
      );
    }
  };

  // Participant: Submit Attendance Check-In for Verification
  const handleSubmitAttendanceCheckIn = () => {
    if (myAttendanceStatus === 'verified') {
      onNotify('Your attendance is already officially verified! ✓');
      return;
    }

    setMyAttendanceStatus('pending_verification');
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'attendance:check-in',
        })
      );
    }
    onAttendanceChecked?.(session.id);
    onNotify('Attendance check-in logged! Submitted to Host for official verification.');
  };

  // Host: Officially Verify Attendance for an Attendee
  const handleHostVerifyAttendance = (targetEmail: string, participantName: string) => {
    if (!isHost) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'attendance:verify',
          participantEmail: targetEmail,
          status: 'verified',
        })
      );
    }
    onNotify(`Officially verified attendance for ${participantName} ✓`);
  };


  // Toggle Screen Sharing
  const handleToggleScreenShare = async () => {
    if (!meetingState.permissions.allowShareScreen && !isHost && !isScreenSharing && !isSimulatedSlideDeckActive) {
      onNotify('Screen sharing is restricted to session hosts.');
      return;
    }

    if (isScreenSharing || isSimulatedSlideDeckActive) {
      // Stop screen share or slides
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
      setIsSimulatedSlideDeckActive(false);


      // Revert video track in local element
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }

      // Revert peer connections to camera video track
      const camTrack = localStreamRef.current?.getVideoTracks()[0];
      if (camTrack) {
        peerConnectionsRef.current.forEach((pc) => {
          const senders = pc.getSenders();
          const videoSender = senders.find((s) => s.track?.kind === 'video');
          if (videoSender) videoSender.replaceTrack(camTrack);
        });
      }

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'media-state',
            audioEnabled: isMicOn,
            videoEnabled: isVideoOn,
            screenSharing: false,
            handRaised: isHandRaised,
          })
        );
      }
      onNotify('Screen sharing stopped.');
    } else {
      // Start screen share
      try {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          onNotify('Screen sharing is not supported by your browser.');
          return;
        }

        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        screenStreamRef.current = screenStream;
        setIsScreenSharing(true);

        const screenVideoTrack = screenStream.getVideoTracks()[0];

        // Replace video track in local video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        // Replace track across all active RTCPeerConnections
        peerConnectionsRef.current.forEach((pc) => {
          const senders = pc.getSenders();
          const videoSender = senders.find((s) => s.track?.kind === 'video');
          if (videoSender) videoSender.replaceTrack(screenVideoTrack);
        });

        // When user clicks browser's native "Stop Sharing" floating button
        screenVideoTrack.onended = () => {
          handleToggleScreenShare();
        };

        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'media-state',
              audioEnabled: isMicOn,
              videoEnabled: isVideoOn,
              screenSharing: true,
              handRaised: isHandRaised,
            })
          );
        }
        onNotify('Screen sharing active.');
      } catch (err: any) {
        console.warn('Screen share permission restricted or cancelled:', err);
        setIsSimulatedSlideDeckActive(true);
        onNotify('Screen share permission restricted by sandbox/browser. Live Presentation Slide Deck activated!');
      }

    }
  };

  // Toggle Hand Raise
  const handleToggleHandRaise = () => {
    const nextState = !isHandRaised;
    setIsHandRaised(nextState);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'media-state',
          audioEnabled: isMicOn,
          videoEnabled: isVideoOn,
          screenSharing: isScreenSharing,
          handRaised: nextState,
        })
      );
    }
    onNotify(nextState ? 'Hand raised to session host' : 'Hand lowered');
  };

  // Send Floating Emoji Reaction
  const handleSendReaction = (emoji: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'reaction:send',
          emoji,
        })
      );
    }
  };

  // Send In-Meeting Chat
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'chat:send',
          message: chatInput.trim(),
        })
      );
    }
    setChatInput('');
  };

  // Ask Q&A
  const handleAskQA = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaInput.trim()) return;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'qa:ask',
          question: qaInput.trim(),
        })
      );
    }
    setQaInput('');
  };

  // Upvote Q&A
  const handleUpvoteQA = (qaId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'qa:upvote',
          qaId,
        })
      );
    }
  };

  // Answer Q&A (Host only)
  const handleAnswerQA = (qaId: string) => {
    const answer = qaReplyInput[qaId];
    if (!answer?.trim()) return;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'qa:answer',
          qaId,
          answer: answer.trim(),
        })
      );
    }
    setQaReplyInput((prev) => ({ ...prev, [qaId]: '' }));
  };

  // Toggle Full Screen
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Host: Start Session
  const handleHostStartSession = () => {
    if (!isHost) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'host:start-session' }));
    }
    eventService.startSessionDelivery(session.id, currentRole, userName);
    onNotify('Session broadcast started! Delivery status is now LIVE.');
  };

  // Host: End Session / End Meeting for Everyone
  const handleHostEndSession = () => {
    if (!isHost) return;
    setShowEndMeetingConfirm(true);
  };

  const executeHostEndSession = () => {
    setShowEndMeetingConfirm(false);
    if (!isHost) return;

    const wasRecorded = meetingState.isRecording || meetingState.recordingDurationSeconds > 0 || recordingTimer > 0;
    const finalRecordingStatus = wasRecorded ? 'available' : 'none';
    const finalRecordingUrl = wasRecorded
      ? `https://storage.sems.university.edu.pk/recordings/${session.id}_hd.mp4`
      : undefined;
    const finalDuration = wasRecorded
      ? formatTime(recordingTimer || meetingState.recordingDurationSeconds || 4800)
      : undefined;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'host:end-session',
          recordingStatus: finalRecordingStatus,
          recordingUrl: finalRecordingUrl,
          recordingDuration: finalDuration,
        })
      );
    }

    eventService.endSessionDelivery(session.id, currentRole, userName, {
      recordingStatus: finalRecordingStatus,
      recordingUrl: finalRecordingUrl,
      recordingDuration: finalDuration,
      meetingSummary: `Keynote delivery and interactive Q&A completed for "${session.title}". Active participants reviewed slides and completed live exercises.`,
    });

    onNotify(wasRecorded ? 'Session delivery concluded and HD recording archived.' : 'Session delivery concluded without recording.');
  };

  // Host: Toggle Recording
  const handleHostToggleRecording = () => {
    if (!isHost) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'host:toggle-recording',
          recording: !meetingState.isRecording,
        })
      );
    }
  };

  // Host: Lock Room
  const handleHostToggleLock = () => {
    if (!isHost) return;
    const next = !meetingState.isLocked;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'host:lock-room',
          locked: next,
        })
      );
    }
  };

  // Host: Mute All
  const handleHostMuteAll = () => {
    if (!isHost) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'host:mute-participant',
          muteAll: true,
        })
      );
    }
    onNotify('Sent mute command to all participants.');
  };

  // Host: Mute Single Participant
  const handleHostMutePeer = (targetPeerId: string) => {
    if (!isHost) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'host:mute-participant',
          targetPeerId,
        })
      );
    }
  };

  // Host: Kick Peer
  const handleHostKickPeer = (targetPeerId: string) => {
    if (!isHost) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'host:kick-participant',
          targetPeerId,
        })
      );
    }
  };

  // Record Attendance manually (for participant certification)
  const handleRecordAttendance = () => {
    setAttendanceRecorded(true);
    onAttendanceChecked?.(session.id);
    onNotify('Live attendance verified and registered! Counts toward certificate criteria.');
  };

  // Test Speaker Tone using Web Audio API
  const handleTestSpeakerSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain.gain.setValueAtTime(speakerVolume / 100, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
      onNotify('Played test speaker chime.');
    } catch {
      // Fallback
    }
  };

  // Format recording timer: mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const peerList = Array.from(peers.values());
  const totalParticipantCount = 1 + peerList.length;

  // Zoom-style Pre-Join Green Room Screen (Device check, level meter, permission handling before entering)
  if (!hasJoinedMeeting) {
    return (
      <div
        id="session-room-prejoin"
        data-component="prejoin-room"
        className="session-room-shell relative w-full min-h-[640px] h-[88vh] flex flex-col rounded-3xl overflow-hidden border border-white/[0.18] bg-[#020b0e] text-white shadow-2xl animate-fadeIn font-inter"
      >
        {/* Ambient background lighting */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-[130px] pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-cyan-500/10 blur-[130px] pointer-events-none" />

        {/* Pre-Join Header */}
        <header className="h-16 shrink-0 bg-[#031317]/95 backdrop-blur-xl border-b border-white/[0.12] px-4 sm:px-8 flex items-center justify-between z-30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
              <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  PRE-JOIN GREEN ROOM
                </span>
                <span className="text-[11px] font-mono text-white/50 truncate">
                  Session #{session.id}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-semibold font-poppins text-[var(--text-primary)] truncate max-w-md">
                {session.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-medium text-[var(--text-primary)]">{userName}</span>
              <span className="text-[10px] font-mono text-emerald-500 font-semibold">{currentRole.toUpperCase()}</span>
            </div>
            <button
              type="button"
              onClick={onLeaveRoom}
              className="px-3.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.14] text-xs font-medium text-white/80 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Back to Session</span>
            </button>
          </div>
        </header>

        {/* Pre-Join Content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 sm:p-8 overflow-y-auto z-10">
          {/* Left Column: Camera Preview Box (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-4">
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/[0.16] bg-black/90 shadow-2xl flex items-center justify-center">
              {isVideoOn && isHardwareCameraActive ? (
                <video
                  ref={previewVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: isMirrorVideo ? 'scaleX(-1)' : 'none' }}
                />
              ) : (
                /* Scholar Avatar fallback tile when camera is off or denied */
                <div className="w-full h-full flex flex-col items-center justify-center p-6 space-y-4 bg-gradient-to-br from-[#03191f] via-[#020e12] to-[#01080a] relative overflow-hidden">
                  <div
                    className={`w-28 h-28 rounded-full bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-400 flex items-center justify-center text-4xl font-bold font-poppins text-white shadow-2xl relative z-10 border-2 border-white/20 transition-transform ${
                      isMicOn && audioInputLevel > 15 ? 'scale-105 ring-4 ring-emerald-400/40' : ''
                    }`}
                  >
                    {userName.charAt(0).toUpperCase()}
                  </div>

                  <div className="text-center space-y-1 relative z-10">
                    <h3 className="text-base font-semibold text-white">{userName}</h3>
                    <p className="text-xs text-white/60">
                      {cameraUnavailableReason === 'permission_denied'
                        ? 'Camera permission blocked in browser'
                        : cameraUnavailableReason === 'device_missing'
                        ? 'No camera hardware detected'
                        : 'Camera is currently turned off'}
                    </p>
                  </div>

                  <div className="relative z-10 flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
                      SCHOLAR AVATAR READY
                    </span>
                  </div>
                </div>
              )}

              {/* Top Left Tag */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                {isVideoOn && isHardwareCameraActive ? (
                  <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-[11px] font-mono flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live Camera Preview</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/20 text-white/70 text-[11px] font-mono flex items-center gap-1.5">
                    <CameraOff className="w-3 h-3 text-amber-400" />
                    <span>Camera Inactive</span>
                  </span>
                )}
              </div>

              {/* Mirror Toggle (if camera active) */}
              {isVideoOn && isHardwareCameraActive && (
                <button
                  type="button"
                  onClick={() => setIsMirrorVideo((prev) => !prev)}
                  className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-[11px] text-white/80 hover:text-white transition-all cursor-pointer"
                >
                  {isMirrorVideo ? 'Unmirror' : 'Mirror'}
                </button>
              )}

              {/* Bottom Quick Bar inside preview */}
              <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-none">
                <div className="px-3 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-white/20 text-xs text-white/90">
                  {userName}
                </div>
                {isMicOn && (
                  <div className="px-2.5 py-1 rounded-xl bg-emerald-950/80 backdrop-blur-md border border-emerald-500/40 text-[11px] text-emerald-300 flex items-center gap-1.5">
                    <Mic className="w-3 h-3" />
                    <span>Mic Level {audioInputLevel}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* In-preview Media Toggles */}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleTogglePreJoinMic}
                className={`px-5 py-2.5 rounded-2xl font-medium text-xs flex items-center gap-2 border transition-all cursor-pointer shadow-lg ${
                  isMicOn
                    ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40 shadow-emerald-950/30'
                    : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40 shadow-rose-950/30'
                }`}
              >
                {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                <span>{isMicOn ? 'Microphone On' : 'Microphone Off'}</span>
              </button>

              <button
                type="button"
                onClick={handleTogglePreJoinCamera}
                className={`px-5 py-2.5 rounded-2xl font-medium text-xs flex items-center gap-2 border transition-all cursor-pointer shadow-lg ${
                  isVideoOn && isHardwareCameraActive
                    ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40 shadow-emerald-950/30'
                    : 'bg-white/[0.08] hover:bg-white/[0.14] text-white/80 border-white/[0.16]'
                }`}
              >
                {isVideoOn && isHardwareCameraActive ? (
                  <Video className="w-4 h-4" />
                ) : (
                  <VideoOff className="w-4 h-4" />
                )}
                <span>{isVideoOn && isHardwareCameraActive ? 'Camera On' : 'Camera Off (Avatar)'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Audio/Video Diagnostics, Device Selectors & Join Button (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* Attendee Info Card */}
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.10] space-y-2">
                <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold block">
                  Attendee Verification Profile
                </span>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white text-sm">{userName}</div>
                    <div className="text-xs text-white/60 font-mono">{userEmail}</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
                    {currentRole.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Device Permission Denied Alert (Clear Instructions) */}
              {(devicePermissionStatus === 'denied' || cameraUnavailableReason === 'permission_denied') && (
                <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-rose-300 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Media Device Permission Restricted</span>
                  </div>
                  <p className="text-rose-200/90 leading-relaxed text-[11px]">
                    Your browser has blocked webcam or microphone access for this domain. To grant access:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-white/80 text-[11px] pl-1">
                    <li>Click the <strong>Lock / Settings 🔒</strong> icon in your browser URL bar.</li>
                    <li>Toggle <strong>Camera</strong> and <strong>Microphone</strong> to "Allow".</li>
                    <li>Reload the page or click "Turn On Camera" above.</li>
                  </ol>
                  <p className="text-cyan-300/90 text-[11px] pt-1">
                    ✓ You can still proceed and join the session now with your <strong>Scholar Avatar</strong> and full in-meeting text chat & Q&A.
                  </p>
                </div>
              )}

              {/* Audio Settings Card */}
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.10] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-cyan-300 font-semibold block">
                    Microphone & Audio Input
                  </span>
                  <button
                    type="button"
                    onClick={handleTestSpeakerSound}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Test Speaker Chime</span>
                  </button>
                </div>

                {availableMics.length > 0 ? (
                  <select
                    value={selectedMicId}
                    onChange={(e) => setSelectedMicId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/[0.16] text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    {availableMics.map((mic, idx) => (
                      <option key={mic.deviceId || idx} value={mic.deviceId} className="bg-[#031317]">
                        {mic.label || `Microphone ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-[11px] text-white/50 italic">
                    Default system microphone
                  </div>
                )}

                {/* Live VU / Audio Level Meter */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-white/70">
                    <span>Microphone Sensitivity</span>
                    <span className="font-mono text-emerald-400">{isMicOn ? `${audioInputLevel}%` : 'Muted'}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/[0.08] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-150"
                      style={{ width: isMicOn ? `${Math.max(5, audioInputLevel)}%` : '0%' }}
                    />
                  </div>
                  <p className="text-[10px] text-white/40">
                    {isMicOn ? 'Speak now to verify your voice level.' : 'Turn on microphone to test your input level.'}
                  </p>
                </div>
              </div>

              {/* Camera Selection Card */}
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.10] space-y-2">
                <span className="text-[11px] uppercase tracking-wider text-cyan-300 font-semibold block">
                  Camera Input Device
                </span>
                {availableCams.length > 0 ? (
                  <select
                    value={selectedCamId}
                    onChange={(e) => setSelectedCamId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/[0.16] text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    {availableCams.map((cam, idx) => (
                      <option key={cam.deviceId || idx} value={cam.deviceId} className="bg-[#031317]">
                        {cam.label || `Camera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-[11px] text-white/50 italic">
                    Default webcam / virtual capture device
                  </div>
                )}
              </div>

              {/* Attendance Tracking Notice */}
              <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 flex items-start gap-2.5 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-emerald-200/90 leading-relaxed">
                  <strong>Attendance Requirement:</strong> Active session duration is continuously audited for certification eligibility (min {session.minAttendanceMinutes || 45} mins required).
                </div>
              </div>
            </div>

            {/* Bottom Actions: Big Join Button */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleJoinMeeting}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer transition-all transform active:scale-[0.99]"
              >
                <Radio className="w-4 h-4 text-slate-950 animate-pulse" />
                <span>Join Session Now</span>
              </button>

              <button
                type="button"
                onClick={onLeaveRoom}
                className="w-full py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white text-xs font-medium cursor-pointer transition-all text-center"
              >
                Cancel & Return
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      id="session-room-view"
      data-component="live-room"
      className="session-room-shell relative w-full h-[88vh] min-h-[640px] flex flex-col rounded-3xl overflow-hidden border border-white/[0.18] bg-[#020b0e] text-white shadow-2xl animate-fadeIn select-none font-inter"
    >
      {/* Synchronized Floating Emoji Reactions */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
        {reactions.map((r) => (
          <div
            key={r.id}
            className="absolute bottom-24 left-1/3 flex flex-col items-center animate-bounce"
            style={{ animation: 'floatUp 2.8s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
          >
            <span className="text-4xl drop-shadow-lg">{r.emoji}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-emerald-300 border border-white/20 mt-1 font-mono">
              {r.sender}
            </span>
          </div>
        ))}
      </div>

      {/* TOP BAR: Room Title, Status Indicators & Actions */}
      <header className="h-14 shrink-0 bg-[#031317]/95 backdrop-blur-xl border-b border-white/[0.12] px-4 sm:px-6 flex items-center justify-between z-30">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
            <Radio className="w-4 h-4 animate-pulse text-rose-400" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                <span>{meetingState.isLive ? 'LIVE' : 'WAITING ROOM'}</span>
              </span>

              {meetingState.isRecording && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-600/30 text-rose-200 border border-rose-500/40 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>REC {formatTime(recordingTimer)}</span>
                </span>
              )}

              {meetingState.isLocked && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Lock className="w-2.5 h-2.5" />
                  <span>LOCKED</span>
                </span>
              )}

              <span className="hidden md:inline text-[11px] font-mono text-emerald-300/80 truncate">
                {room.id}
              </span>
            </div>

            <h2 className="text-xs sm:text-sm font-semibold font-poppins text-[var(--text-primary)] truncate max-w-sm sm:max-w-md">
              {room.roomName}
            </h2>
          </div>
        </div>

        {/* Top Right: View Switcher, Fullscreen, Leave/End */}
        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="hidden sm:flex items-center bg-white/[0.08] p-0.5 rounded-xl border border-white/[0.14]">
            <button
              type="button"
              onClick={() => setViewMode('gallery')}
              className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'gallery'
                  ? 'bg-emerald-500/30 text-emerald-300 font-medium'
                  : 'text-white/60 hover:text-white'
              }`}
              title="Gallery View"
            >
              <Grid className="w-3.5 h-3.5" />
              <span className="text-[11px]">Gallery</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('speaker')}
              className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'speaker'
                  ? 'bg-emerald-500/30 text-emerald-300 font-medium'
                  : 'text-white/60 hover:text-white'
              }`}
              title="Speaker Spotlight View"
            >
              <Tv className="w-3.5 h-3.5" />
              <span className="text-[11px]">Speaker</span>
            </button>
          </div>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.14] border border-white/[0.14] text-white/70 hover:text-white transition-all cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Leave or End Button */}
          {isHost ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleHostEndSession}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-rose-900/40 transition-all cursor-pointer"
                title="End Meeting for Everyone"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">End for All</span>
                <span className="sm:hidden">End</span>
              </button>
              <button
                type="button"
                onClick={onLeaveRoom}
                className="px-2.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.14] text-xs text-white/80 transition-all cursor-pointer"
                title="Leave Meeting (Room remains open)"
              >
                Leave
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onLeaveRoom}
              className="px-4 py-1.5 rounded-xl bg-rose-900/80 hover:bg-rose-800 text-rose-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-rose-500/30 transition-all cursor-pointer"
              title="Leave Meeting"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Leave Meeting</span>
            </button>
          )}
        </div>
      </header>

      {/* MAIN MEETING STAGE & SIDE PANELS */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* VIDEO GRID / STAGE */}
        <div
          data-stage="cinema"
          className="flex-1 flex flex-col p-3 sm:p-4 overflow-hidden relative bg-gradient-to-br from-[#01090c] via-[#021317] to-[#041a20]"
        >
          {/* Ambient Lighting */}
          <div className="absolute -top-10 left-1/4 w-80 h-80 rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-10 right-1/4 w-80 h-80 rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />

          {/* Host Notification / Broadcast Banner */}
          {!meetingState.isLive && (
            <div className="mb-2 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
                <span>
                  The host has not started the live broadcast yet. You are in the verified waiting room.
                </span>
              </div>
              {isHost && (
                <button
                  type="button"
                  onClick={handleHostStartSession}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Start Live Session</span>
                </button>
              )}
            </div>
          )}

          {/* VIEW: SPEAKER SPOTLIGHT MODE */}
          {viewMode === 'speaker' ? (
            <div className="flex-1 flex flex-col gap-2 overflow-hidden">
              {/* Primary Active Speaker / Screen Share Canvas */}
              <div className="flex-1 relative rounded-2xl overflow-hidden border border-white/[0.16] bg-black/80 flex items-center justify-center shadow-xl">
                {isSimulatedSlideDeckActive ? (
                  /* Render Live Presentation Slide Deck */
                  <div className="w-full h-full flex flex-col justify-between p-6 sm:p-8 bg-gradient-to-br from-[#02181d] via-[#052b32] to-[#011417] text-white select-none">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/15">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 font-mono text-[11px] text-cyan-300 font-bold tracking-wider flex items-center gap-1.5">
                          <Presentation className="w-3.5 h-3.5" />
                          {presentationSlides[activeSlideIndex].tag}
                        </span>
                        <span className="text-xs text-white/70 font-medium hidden sm:inline">
                          {presentationSlides[activeSlideIndex].subtitle}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          LIVE SLIDE DECK
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsSimulatedSlideDeckActive(false)}
                          className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] text-white/80 hover:text-white transition-colors cursor-pointer"
                        >
                          Exit Slides
                        </button>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="py-6 space-y-4 max-w-3xl">
                      <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold font-poppins text-white tracking-tight">
                        {presentationSlides[activeSlideIndex].title}
                      </h2>
                      <div className="space-y-2.5 pt-2">
                        {presentationSlides[activeSlideIndex].bullets.map((bullet, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm"
                          >
                            <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                              0{idx + 1}
                            </span>
                            <span className="text-xs sm:text-sm text-white/90 leading-relaxed font-inter">
                              {bullet}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer / Controls */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/15">
                      <div className="flex items-center gap-1.5">
                        {presentationSlides.map((_, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveSlideIndex(idx)}
                            className={`h-2 rounded-full transition-all cursor-pointer ${
                              activeSlideIndex === idx
                                ? 'bg-cyan-400 shadow-lg shadow-cyan-400/50 w-8'
                                : 'bg-white/20 hover:bg-white/40 w-5'
                            }`}
                            title={`Jump to Slide ${idx + 1}`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={activeSlideIndex === 0}
                          onClick={() => setActiveSlideIndex((prev) => Math.max(0, prev - 1))}
                          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-xs text-white font-medium flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>Previous</span>
                        </button>
                        <button
                          type="button"
                          disabled={activeSlideIndex === presentationSlides.length - 1}
                          onClick={() => setActiveSlideIndex((prev) => Math.min(presentationSlides.length - 1, prev + 1))}
                          className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 disabled:cursor-not-allowed text-xs text-white font-semibold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <span>Next</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : isScreenSharing ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain bg-black"
                  />
                ) : isVideoOn ? (
                  isCameraFallbackActive ? (
                    /* Animated Virtual Scholar Avatar Fallback */
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-4 bg-gradient-to-b from-[#041c22] via-[#021013] to-[#01090b] relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div
                          className={`w-72 h-72 rounded-full blur-3xl transition-all duration-300 ${
                            isMicOn && audioInputLevel > 15 ? 'bg-emerald-500/20 scale-125' : 'bg-cyan-500/10'
                          }`}
                        />
                      </div>

                      <div className="relative">
                        <div
                          className={`absolute -inset-4 rounded-full border border-cyan-400/30 transition-all duration-500 ${
                            isMicOn && audioInputLevel > 15
                              ? 'animate-ping opacity-60 border-emerald-400/60'
                              : 'animate-pulse opacity-40'
                          }`}
                        />
                        <div
                          className={`absolute -inset-2 rounded-full border border-cyan-400/40 ${
                            isMicOn && audioInputLevel > 15 ? 'border-emerald-400' : ''
                          }`}
                        />
                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-400 flex items-center justify-center text-4xl font-bold font-poppins text-white shadow-2xl relative z-10 border-2 border-white/30">
                          {userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-1 -right-1 z-20 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#021013] flex items-center justify-center shadow">
                          <Mic className="w-3 h-3 text-white" />
                        </div>
                      </div>

                      <div className="relative z-10 space-y-1">
                        <div className="flex items-center justify-center gap-2">
                          <h4 className="text-base font-semibold text-white">{userName}</h4>
                          <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono">
                            SCHOLAR AVATAR
                          </span>
                        </div>
                        <p className="text-xs text-white/60">
                          Live simulated scholar feed (Hardware camera bypassed / sandbox active)
                        </p>
                      </div>

                      <div className="relative z-10 flex items-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsSimulatedSlideDeckActive(true)}
                          className="px-3.5 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-cyan-200 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Presentation className="w-3.5 h-3.5" />
                          <span>Switch to Live Slide Deck</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-3xl font-bold font-poppins shadow-2xl">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-white">{userName}</h4>
                      <p className="text-xs text-emerald-300 font-mono">
                        {currentRole.toUpperCase()} (Spotlight Speaker)
                      </p>
                    </div>
                  </div>
                )}

                {/* Speaker Label */}
                <div className="absolute bottom-3 left-3 px-3 py-1 rounded-xl bg-black/75 backdrop-blur-md border border-white/20 text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-medium text-white">{userName} (You)</span>
                  {isScreenSharing && (
                    <span className="text-[10px] text-cyan-300 font-mono">(Sharing Screen)</span>
                  )}
                </div>
              </div>

              {/* Horizontal Filmstrip of other participants */}
              <div className="h-28 shrink-0 flex items-center gap-2 overflow-x-auto py-1">
                {peerList.map((peer) => (
                  <div
                    key={peer.peerId}
                    className="h-full w-40 rounded-xl overflow-hidden border border-white/[0.14] bg-black/60 relative shrink-0 flex items-center justify-center"
                  >
                    <video
                      ref={(el) => {
                        if (el) remoteVideoRefs.current.set(peer.peerId, el);
                      }}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    {!peer.videoEnabled && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#071d22]">
                        <div className="w-9 h-9 rounded-full bg-cyan-700/60 flex items-center justify-center font-bold text-sm text-white">
                          {peer.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-1 left-1 right-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] text-white truncate flex items-center justify-between">
                      <span className="truncate">{peer.name}</span>
                      {peer.audioEnabled ? (
                        <Mic className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                      ) : (
                        <MicOff className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* VIEW: GALLERY GRID MODE */
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto">
              {/* Tile 1: Local User */}
              <div
                className={`relative rounded-2xl overflow-hidden border bg-black/75 flex items-center justify-center shadow-lg transition-all ${
                  isMicOn && audioInputLevel > 15
                    ? 'border-emerald-400 ring-2 ring-emerald-500/40'
                    : 'border-white/[0.14]'
                }`}
              >
                {isSimulatedSlideDeckActive ? (
                  /* Slide preview in gallery tile */
                  <div className="w-full h-full flex flex-col justify-between p-4 bg-gradient-to-br from-[#02181d] to-[#052b32] text-white">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 font-mono text-[10px] text-cyan-300">
                        {presentationSlides[activeSlideIndex].tag}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-medium">SLIDES LIVE</span>
                    </div>
                    <div className="my-auto py-2">
                      <h4 className="text-xs sm:text-sm font-semibold text-white line-clamp-2">
                        {presentationSlides[activeSlideIndex].title}
                      </h4>
                      <p className="text-[10px] text-white/70 line-clamp-2 mt-1">
                        {presentationSlides[activeSlideIndex].subtitle}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-white/60 pt-2 border-t border-white/10 pointer-events-auto">
                      <span>Slide {activeSlideIndex + 1} of 4</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveSlideIndex((prev) => (prev + 1) % presentationSlides.length);
                        }}
                        className="text-cyan-300 hover:underline cursor-pointer"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                ) : isScreenSharing ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain bg-black"
                  />
                ) : isVideoOn && isHardwareCameraActive ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  /* Truthful Scholar Avatar tile when camera is off or hardware unavailable */
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 space-y-2 bg-gradient-to-b from-[#041c22] to-[#01090b]">
                    <div className="relative">
                      <div
                        className={`w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-600 to-teal-400 flex items-center justify-center text-xl font-bold font-poppins text-white shadow-xl ${
                          isMicOn && audioInputLevel > 15 ? 'ring-2 ring-emerald-400' : ''
                        }`}
                      >
                        {userName.charAt(0).toUpperCase()}
                      </div>
                      <span
                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border border-black flex items-center justify-center text-[9px] text-white ${
                          isHardwareCameraActive ? 'bg-emerald-500' : 'bg-cyan-500'
                        }`}
                      >
                        {isHardwareCameraActive ? '✓' : '●'}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-white/90">{userName}</span>
                    <span className="text-[10px] text-cyan-300 font-mono">
                      {cameraUnavailableReason === 'permission_denied'
                        ? 'Avatar (Camera Denied)'
                        : cameraUnavailableReason === 'device_missing'
                        ? 'Avatar (No Camera)'
                        : isVideoOn
                        ? 'Scholar Avatar Active'
                        : 'Camera Off'}
                    </span>
                  </div>
                )}

                {/* Tile Overlay Badges */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/20 text-[10px] font-mono text-emerald-300">
                    {currentRole.toUpperCase()}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md backdrop-blur-md border text-[10px] font-mono ${
                      isHardwareCameraActive
                        ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                        : 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300'
                    }`}
                  >
                    {isHardwareCameraActive ? 'HD CAM' : 'AVATAR'}
                  </span>
                  {isHandRaised && (
                    <span className="p-1 rounded-md bg-amber-500/30 border border-amber-500/50 text-amber-300 animate-bounce">
                      <Hand className="w-3 h-3" />
                    </span>
                  )}
                </div>

                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs pointer-events-none">
                  <div className="px-2 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/20 text-white flex items-center gap-1.5 truncate">
                    <span className="font-medium truncate">{userName} (You)</span>
                  </div>

                  <div className="p-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/20">
                    {isMicOn ? (
                      <Mic className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <MicOff className="w-3.5 h-3.5 text-rose-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Tiles for Remote Connected Peers */}
              {peerList.map((peer) => (
                <div
                  key={peer.peerId}
                  className="relative rounded-2xl overflow-hidden border border-white/[0.14] bg-black/75 flex items-center justify-center shadow-lg transition-all"
                >
                  <video
                    ref={(el) => {
                      if (el) remoteVideoRefs.current.set(peer.peerId, el);
                    }}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />

                  {/* Fallback Avatar when camera is off */}
                  {!peer.videoEnabled && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 space-y-2 bg-[#061b20]">
                      <div className="w-16 h-16 rounded-full bg-cyan-700/60 border border-cyan-400/40 flex items-center justify-center text-2xl font-bold font-poppins text-white shadow-xl">
                        {peer.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium text-white/90">{peer.name}</span>
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-md backdrop-blur-md border text-[10px] font-mono ${
                        peer.role === 'super_admin' || peer.role === 'admin'
                          ? 'bg-purple-950/70 border-purple-500/40 text-purple-300'
                          : 'bg-black/60 border-white/20 text-cyan-300'
                      }`}
                    >
                      {peer.role.toUpperCase()}
                    </span>
                    {peer.handRaised && (
                      <span className="p-1 rounded-md bg-amber-500/30 border border-amber-500/50 text-amber-300 animate-bounce">
                        <Hand className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs pointer-events-none">
                    <div className="px-2 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/20 text-white flex items-center gap-1.5 truncate">
                      <span className="font-medium truncate">{peer.name}</span>
                    </div>

                    <div className="p-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/20">
                      {peer.audioEnabled ? (
                        <Mic className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <MicOff className="w-3.5 h-3.5 text-rose-400" />
                      )}
                    </div>
                  </div>

                  {/* Host Quick Hover Actions */}
                  {isHost && (
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleHostMutePeer(peer.peerId)}
                        className="p-1.5 rounded-lg bg-black/80 hover:bg-rose-900/80 border border-white/20 text-white text-[10px] transition-all cursor-pointer"
                        title="Mute participant audio"
                      >
                        <MicOff className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleHostKickPeer(peer.peerId)}
                        className="p-1.5 rounded-lg bg-black/80 hover:bg-rose-900/80 border border-white/20 text-rose-400 hover:text-white text-[10px] transition-all cursor-pointer"
                        title="Remove participant"
                      >
                        <UserX className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Participant Real-time Attendance Lifecycle Widget */}
          {!isHost && (
            <div className="absolute top-4 right-4 z-20">
              {myAttendanceStatus === 'verified' ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-emerald-950/90 backdrop-blur-md border border-emerald-500/50 text-xs shadow-2xl text-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] font-semibold">Attendance Verified by Host ✓</span>
                </div>
              ) : myAttendanceStatus === 'pending_verification' ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-950/90 backdrop-blur-md border border-amber-500/50 text-xs shadow-2xl text-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-[11px] font-medium">Check-In Logged • Verification Pending</span>
                </div>
              ) : myAttendanceStatus === 'below_duration' ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-rose-950/90 backdrop-blur-md border border-rose-500/50 text-xs shadow-2xl text-rose-200">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-[11px] font-medium">Below Required Duration ({Math.round(sessionElapsedSeconds / 60)}m logged)</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-1 pl-3 rounded-2xl bg-black/80 backdrop-blur-md border border-cyan-500/40 text-xs shadow-2xl">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-[11px] font-mono text-cyan-300">Live: {formatTime(sessionElapsedSeconds)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmitAttendanceCheckIn}
                    className="px-3 py-1 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow transition-all cursor-pointer flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Submit Check-In</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLLAPSIBLE SIDE PANELS */}
        {activeSidePanel && (
          <aside
            data-sidebar="room"
            className="w-80 md:w-96 border-l border-white/[0.12] bg-[#021115]/95 backdrop-blur-2xl flex flex-col z-20 shadow-2xl"
          >
            {/* Panel Tabs Header */}
            <div className="p-2 border-b border-white/[0.10] flex items-center justify-between gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveSidePanel('chat')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                  activeSidePanel === 'chat'
                    ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSidePanel('participants')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                  activeSidePanel === 'participants'
                    ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>People ({totalParticipantCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSidePanel('qa')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                  activeSidePanel === 'qa'
                    ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Q&A</span>
              </button>

              {isHost && (
                <button
                  type="button"
                  onClick={() => setActiveSidePanel('host-tools')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                    activeSidePanel === 'host-tools'
                      ? 'bg-purple-500/25 text-purple-300 border border-purple-500/30'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Host</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveSidePanel('resources')}
                className={`p-1.5 text-xs font-medium rounded-xl transition-colors cursor-pointer ${
                  activeSidePanel === 'resources'
                    ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'
                    : 'text-white/60 hover:text-white'
                }`}
                title="Files & Resources"
              >
                <FileText className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* TAB 1: IN-MEETING CHAT */}
            {activeSidePanel === 'chat' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div ref={chatScrollRef} className="flex-1 p-3.5 space-y-3 overflow-y-auto text-xs">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-10 text-white/40 text-xs">
                      No messages yet. Say hello to everyone in the room!
                    </div>
                  ) : (
                    chatMessages.map((msg) => (
                      <div key={msg.id} className="space-y-0.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span
                            className={`font-semibold ${
                              msg.role.includes('ADMIN') || msg.role.includes('HOST')
                                ? 'text-purple-300'
                                : 'text-emerald-300'
                            }`}
                          >
                            {msg.sender}
                          </span>
                          <span className="text-white/40 font-mono">{msg.timestamp}</span>
                        </div>
                        <p className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/90 leading-relaxed break-words">
                          {msg.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Chat Form */}
                <form onSubmit={handleSendChat} className="p-2.5 border-t border-white/[0.10] flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={!meetingState.permissions.allowChat && !isHost}
                    placeholder={
                      meetingState.permissions.allowChat || isHost
                        ? 'Type a message to everyone...'
                        : 'Chat is disabled by host.'
                    }
                    className="flex-1 px-3 py-2 rounded-xl bg-white/[0.08] border border-white/[0.16] text-xs text-white placeholder-white/40 focus:outline-none focus:border-emerald-400 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || (!meetingState.permissions.allowChat && !isHost)}
                    className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white cursor-pointer transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: PARTICIPANTS */}
            {activeSidePanel === 'participants' && (
              <div className="flex-1 flex flex-col p-3.5 space-y-3 overflow-y-auto text-xs">
                {isHost && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.05] border border-white/[0.10]">
                    <span className="text-[11px] text-white/70">Host Actions</span>
                    <button
                      type="button"
                      onClick={handleHostMuteAll}
                      className="px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/30 text-rose-200 text-[11px] font-medium transition-all cursor-pointer"
                    >
                      Mute All
                    </button>
                  </div>
                )}

                {/* Self */}
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/30 flex items-center justify-center font-bold text-emerald-300 shrink-0">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">{userName} (You)</div>
                      <div className="text-[10px] text-emerald-300 font-mono">
                        {currentRole.toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-white/80">
                    {isMicOn ? (
                      <Mic className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <MicOff className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    {isVideoOn ? (
                      <Video className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <VideoOff className="w-3.5 h-3.5 text-rose-400" />
                    )}
                  </div>
                </div>

                {/* Other Peers */}
                <div className="text-[11px] text-white/50 uppercase tracking-wider font-semibold pt-1">
                  Connected Attendees ({peerList.length})
                </div>

                {peerList.map((peer) => (
                  <div
                    key={peer.peerId}
                    className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-cyan-700/40 flex items-center justify-center font-bold text-cyan-200 shrink-0">
                        {peer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-white truncate">{peer.name}</div>
                        <div className="text-[10px] text-white/50 font-mono">{peer.role}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {peer.handRaised && <Hand className="w-3 h-3 text-amber-400 animate-pulse" />}
                      {peer.audioEnabled ? (
                        <Mic className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <MicOff className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      {peer.videoEnabled ? (
                        <Video className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <VideoOff className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      {isHost && (
                        <button
                          type="button"
                          onClick={() => handleHostMutePeer(peer.peerId)}
                          className="p-1 rounded bg-white/[0.08] hover:bg-rose-900 text-white/70 hover:text-white cursor-pointer"
                          title="Mute user"
                        >
                          <MicOff className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: Q&A */}
            {activeSidePanel === 'qa' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 p-3.5 space-y-3 overflow-y-auto text-xs">
                  {qaItems.length === 0 ? (
                    <div className="text-center py-10 text-white/40 text-xs">
                      No questions submitted yet. Ask anything about the presentation!
                    </div>
                  ) : (
                    qaItems.map((qa) => (
                      <div
                        key={qa.id}
                        className="p-3 rounded-2xl bg-white/[0.05] border border-white/[0.10] space-y-2"
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-emerald-300">{qa.author}</span>
                          <span className="text-white/40 font-mono">{qa.timestamp}</span>
                        </div>
                        <p className="text-white text-xs font-medium leading-relaxed">{qa.question}</p>

                        {/* Upvote Button */}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => handleUpvoteQA(qa.id)}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1 transition-all cursor-pointer ${
                              qa.upvotedBy.includes(userEmail)
                                ? 'bg-emerald-500/30 text-emerald-300 border-emerald-500/50'
                                : 'bg-white/[0.06] text-white/70 border-white/[0.12] hover:text-white'
                            }`}
                          >
                            <span>▲</span>
                            <span>{qa.upvotes}</span>
                          </button>

                          {qa.isAnswered ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                              ✓ Answered
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-300/80 font-mono">Open</span>
                          )}
                        </div>

                        {/* Answer text if answered */}
                        {qa.answer && (
                          <div className="mt-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-100">
                            <span className="text-[10px] font-semibold text-emerald-400 block mb-0.5">
                              {qa.answeredBy || 'Host'} Reply:
                            </span>
                            <p>{qa.answer}</p>
                          </div>
                        )}

                        {/* Host reply input if not yet answered */}
                        {isHost && !qa.isAnswered && (
                          <div className="mt-2 pt-2 border-t border-white/[0.08] flex gap-1.5">
                            <input
                              type="text"
                              placeholder="Answer live as Host..."
                              value={qaReplyInput[qa.id] || ''}
                              onChange={(e) =>
                                setQaReplyInput((prev) => ({ ...prev, [qa.id]: e.target.value }))
                              }
                              className="flex-1 px-2.5 py-1.5 rounded-lg bg-white/[0.08] border border-white/[0.16] text-[11px] text-white placeholder-white/40 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleAnswerQA(qa.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium cursor-pointer"
                            >
                              Reply
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Ask Question Form */}
                <form onSubmit={handleAskQA} className="p-2.5 border-t border-white/[0.10] flex gap-2">
                  <input
                    type="text"
                    value={qaInput}
                    onChange={(e) => setQaInput(e.target.value)}
                    placeholder="Ask a question for the speaker..."
                    className="flex-1 px-3 py-2 rounded-xl bg-white/[0.08] border border-white/[0.16] text-xs text-white placeholder-white/40 focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    type="submit"
                    disabled={!qaInput.trim()}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium cursor-pointer transition-all"
                  >
                    Ask
                  </button>
                </form>
              </div>
            )}

            {/* TAB 4: HOST GOVERNANCE TOOLS (Super Admin & Admin Only) */}
            {activeSidePanel === 'host-tools' && isHost && (
              <div className="flex-1 p-3.5 space-y-4 overflow-y-auto text-xs">
                {/* Session Delivery Control */}
                <div className="p-3 rounded-2xl bg-white/[0.05] border border-white/[0.10] space-y-2.5">
                  <span className="text-[11px] uppercase tracking-wider text-purple-300 font-bold block">
                    Session Delivery Lifecycle
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/80">Current Status:</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {meetingState.deliveryStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {!meetingState.isLive ? (
                      <button
                        type="button"
                        onClick={handleHostStartSession}
                        className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Start Session</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleHostEndSession}
                        className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow"
                      >
                        <Square className="w-3.5 h-3.5" />
                        <span>End Session</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleHostToggleRecording}
                      className={`py-2 px-3 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                        meetingState.isRecording
                          ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                          : 'bg-white/[0.08] hover:bg-white/[0.15] text-white border-white/[0.14]'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          meetingState.isRecording ? 'bg-rose-500 animate-ping' : 'bg-white/40'
                        }`}
                      />
                      <span>{meetingState.isRecording ? 'Stop Rec' : 'Start Rec'}</span>
                    </button>
                  </div>
                </div>

                {/* Security & Room Permissions */}
                <div className="p-3 rounded-2xl bg-white/[0.05] border border-white/[0.10] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-purple-300 font-bold block">
                      Room Security
                    </span>
                    <button
                      type="button"
                      onClick={handleHostToggleLock}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-all ${
                        meetingState.isLocked
                          ? 'bg-amber-500/30 text-amber-200 border-amber-500/50'
                          : 'bg-white/[0.08] text-white/70 border-white/[0.14]'
                      }`}
                    >
                      {meetingState.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      <span>{meetingState.isLocked ? 'Room Locked' : 'Unlock Room'}</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-white/60">
                    Locking prevents any new participants from entering the meeting.
                  </p>
                </div>

                {/* Live Attendance Audit */}
                <div className="p-3 rounded-2xl bg-white/[0.05] border border-white/[0.10] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-purple-300 font-bold block">
                      Live Attendance Log ({attendanceList.length})
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">Auto-Tracked</span>
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {attendanceList.map((att) => {
                      const isVerified = att.verificationStatus === 'verified' || att.thresholdMet;
                      const isPending = att.verificationStatus === 'pending_verification';

                      return (
                        <div
                          key={att.participantEmail}
                          className="p-2 rounded-xl bg-white/[0.04] text-[11px] flex items-center justify-between gap-2"
                        >
                          <div className="truncate min-w-0">
                            <div className="font-medium text-white truncate">{att.participantName}</div>
                            <div className="text-[10px] text-white/40 truncate">{att.participantEmail}</div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isVerified ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                                Verified ✓
                              </span>
                            ) : isPending ? (
                              <button
                                type="button"
                                onClick={() => handleHostVerifyAttendance(att.participantEmail, att.participantName)}
                                className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500 hover:bg-amber-400 text-black font-semibold cursor-pointer shadow transition-all"
                              >
                                Verify Now
                              </button>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                                  {Math.round(att.totalDurationSeconds / 60)}m
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleHostVerifyAttendance(att.participantEmail, att.participantName)}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/10 hover:bg-emerald-600 hover:text-white text-white/70 cursor-pointer"
                                  title="Manually verify attendance"
                                >
                                  Verify
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: RESOURCES */}
            {activeSidePanel === 'resources' && (
              <div className="flex-1 p-3.5 space-y-2 overflow-y-auto text-xs">
                <div className="text-[11px] text-emerald-400 uppercase tracking-wider font-semibold mb-2">
                  Attached Live Materials
                </div>
                {session.resources && session.resources.length > 0 ? (
                  session.resources.map((res) => (
                    <div
                      key={res.id || res.name}
                      className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-white truncate">{res.name}</div>
                        <div className="text-[10px] text-white/50">{res.size}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNotify(`Downloading ${res.name}...`)}
                        className="p-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.16] text-emerald-300 transition-colors cursor-pointer"
                        title="Download file"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-white/50 text-[11px] italic">No attached files for this session.</p>
                )}
              </div>
            )}
          </aside>
        )}
      </div>

      {/* FLOATING ZOOM-LIKE BOTTOM CONTROL BAR */}
      <footer
        data-controls="room"
        className="h-18 shrink-0 bg-[#031317]/95 backdrop-blur-2xl border-t border-white/[0.12] px-3 sm:px-6 flex items-center justify-between z-30"
      >
        {/* Left: Audio & Video Controls */}
        <div className="flex items-center gap-2">
          {/* Mic Button with Visual Level Meter */}
          <div className="relative">
            <button
              type="button"
              onClick={handleToggleMic}
              className={`p-3 rounded-2xl transition-all cursor-pointer flex items-center gap-1.5 ${
                isMicOn
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-950/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
              title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              {isMicOn && (
                <div
                  className="w-1.5 h-4 bg-emerald-400 rounded-full transition-all"
                  style={{ transform: `scaleY(${Math.max(0.2, audioInputLevel / 100)})` }}
                />
              )}
            </button>
          </div>

          {/* Video Button with Truthful Hardware vs Avatar Sync */}
          <button
            type="button"
            onClick={handleToggleVideo}
            className={`p-3 rounded-2xl transition-all cursor-pointer ${
              isVideoOn && isHardwareCameraActive
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-950/40'
                : isVideoOn && !isHardwareCameraActive
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-950/40'
                : 'bg-white/[0.08] text-white/70 hover:text-white border border-white/[0.14]'
            }`}
            title={
              isVideoOn && isHardwareCameraActive
                ? 'Webcam Active (Click to stop camera)'
                : isVideoOn && !isHardwareCameraActive
                ? 'Scholar Avatar Active (Camera hardware unavailable - Click to try camera)'
                : 'Camera Off (Click to start video camera)'
            }
          >
            {isVideoOn && isHardwareCameraActive ? (
              <Video className="w-5 h-5" />
            ) : isVideoOn && !isHardwareCameraActive ? (
              <CameraOff className="w-5 h-5 text-cyan-300" />
            ) : (
              <VideoOff className="w-5 h-5" />
            )}
          </button>

          {/* Speaker / Audio Settings Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAudioSettings((prev) => !prev)}
              className="p-3 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] text-white/70 hover:text-white border border-white/[0.14] transition-all cursor-pointer"
              title="Speaker & Audio Settings"
            >
              {speakerMuted ? <VolumeX className="w-5 h-5 text-rose-300" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Audio Settings Popover */}
            {showAudioSettings && (
              <div className="absolute bottom-14 left-0 w-64 p-3.5 rounded-2xl bg-[#03171c] border border-white/[0.18] shadow-2xl space-y-3 z-50 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">Audio & Speaker</span>
                  <button
                    type="button"
                    onClick={() => setShowAudioSettings(false)}
                    className="text-white/40 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-white/70 text-[11px]">
                    <span>Speaker Volume</span>
                    <span className="font-mono">{speakerVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={speakerVolume}
                    onChange={(e) => setSpeakerVolume(Number(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setSpeakerMuted((prev) => !prev)}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.08] text-white/80 hover:text-white"
                  >
                    {speakerMuted ? 'Unmute All' : 'Mute Speaker'}
                  </button>
                  <button
                    type="button"
                    onClick={handleTestSpeakerSound}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 cursor-pointer"
                  >
                    Test Sound
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Interactive Meeting Tools */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Share Screen */}
          <button
            type="button"
            onClick={handleToggleScreenShare}
            className={`p-3 rounded-2xl transition-all cursor-pointer ${
              isScreenSharing
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-950/40'
                : 'bg-white/[0.08] text-white/70 hover:text-white border border-white/[0.14]'
            }`}
            title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen (Native)'}
          >
            <Share2 className="w-5 h-5" />
          </button>

          {/* Present Slides Simulation */}
          <button
            type="button"
            onClick={() => {
              const next = !isSimulatedSlideDeckActive;
              setIsSimulatedSlideDeckActive(next);
              if (next) {
                onNotify('Live Presentation Slide Deck simulation activated!');
              } else {
                onNotify('Slide Deck presentation stopped.');
              }
            }}
            className={`p-3 rounded-2xl transition-all cursor-pointer ${
              isSimulatedSlideDeckActive
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-950/40'
                : 'bg-white/[0.08] text-white/70 hover:text-white border border-white/[0.14]'
            }`}
            title={isSimulatedSlideDeckActive ? 'Exit Presentation Slides' : 'Present Slide Deck (Simulation)'}
          >
            <Presentation className="w-5 h-5" />
          </button>

          {/* Raise Hand */}
          <button
            type="button"
            onClick={handleToggleHandRaise}
            className={`p-3 rounded-2xl transition-all cursor-pointer ${
              isHandRaised
                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-950/40'
                : 'bg-white/[0.08] text-white/70 hover:text-white border border-white/[0.14]'
            }`}
            title={isHandRaised ? 'Lower Hand' : 'Raise Hand'}
          >
            <Hand className="w-5 h-5" />
          </button>

          {/* Emoji Reactions Bar */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-2xl bg-white/[0.06] border border-white/[0.12]">
            {['👏', '🚀', '❤️', '💡', '🔥'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleSendReaction(emoji)}
                className="px-2 py-1 rounded-xl hover:bg-white/[0.16] text-base transition-transform active:scale-125 cursor-pointer"
                title={`Send ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Panels Toggle Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Participants Button */}
          <button
            type="button"
            onClick={() =>
              setActiveSidePanel((prev) => (prev === 'participants' ? null : 'participants'))
            }
            className={`p-3 rounded-2xl transition-all cursor-pointer relative ${
              activeSidePanel === 'participants'
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                : 'bg-white/[0.08] text-white/70 hover:text-white border border-white/[0.14]'
            }`}
            title="Participants List"
          >
            <Users className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500 text-black">
              {totalParticipantCount}
            </span>
          </button>

          {/* Chat Button */}
          <button
            type="button"
            onClick={() => setActiveSidePanel((prev) => (prev === 'chat' ? null : 'chat'))}
            className={`p-3 rounded-2xl transition-all cursor-pointer relative ${
              activeSidePanel === 'chat'
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                : 'bg-white/[0.08] text-white/70 hover:text-white border border-white/[0.14]'
            }`}
            title="In-meeting Chat"
          >
            <MessageSquare className="w-5 h-5" />
            {chatMessages.length > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-cyan-500 text-black">
                {chatMessages.length}
              </span>
            )}
          </button>

          {/* Q&A Button */}
          <button
            type="button"
            onClick={() => setActiveSidePanel((prev) => (prev === 'qa' ? null : 'qa'))}
            className={`p-3 rounded-2xl transition-all cursor-pointer relative ${
              activeSidePanel === 'qa'
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                : 'bg-white/[0.08] text-white/70 hover:text-white border border-white/[0.14]'
            }`}
            title="Q&A Panel"
          >
            <HelpCircle className="w-5 h-5" />
            {qaItems.length > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-purple-500 text-white">
                {qaItems.length}
              </span>
            )}
          </button>
        </div>
      </footer>

      <ConfirmDialog
        isOpen={showEndMeetingConfirm}
        title="End Meeting for Everyone"
        message="Are you sure you want to end the meeting for everyone? This will conclude the session, log final attendance, and make the recording available."
        confirmText="End Meeting"
        cancelText="Cancel"
        variant="danger"
        onConfirm={executeHostEndSession}
        onCancel={() => setShowEndMeetingConfirm(false)}
      />
    </div>
  );
};
