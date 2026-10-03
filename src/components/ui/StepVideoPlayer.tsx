import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { HeronColors, Radius, HeronShadow } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_WIDTH = Math.min(SCREEN_WIDTH - 36, 480);

interface StepVideoPlayerProps {
  videoUrl?: string;
  fallbackImage?: string;
  stepNumber: number;
  stepTitle: string;
}

export const StepVideoPlayer: React.FC<StepVideoPlayerProps> = ({
  videoUrl,
  fallbackImage,
  stepNumber,
  stepTitle,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [hasVideoError, setHasVideoError] = useState(false);

  // Initialize video player with expo-video
  const safeSource = videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
  const player = useVideoPlayer(safeSource, (p) => {
    p.loop = true;
    p.muted = false;
    p.play();
  });

  useEffect(() => {
    if (!player) return;
    const subscription = player.addListener('statusChange', (payload) => {
      if (payload.status === 'error') {
        setHasVideoError(true);
      } else if (payload.status === 'readyToPlay') {
        setHasVideoError(false);
      }
    });
    return () => {
      subscription?.remove?.();
    };
  }, [player]);

  const togglePlay = () => {
    if (!player) return;
    if (player.playing) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!player) return;
    const nextMuted = !player.muted;
    player.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleReplay = () => {
    if (!player) return;
    player.replay();
    setIsPlaying(true);
  };

  const defaultStepImage =
    fallbackImage ||
    'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80';

  return (
    <View style={styles.container}>
      {/* Video Viewport */}
      <Pressable
        onPress={() => setShowControls(!showControls)}
        style={styles.viewport}
      >
        {/* Poster Image Background */}
        <Image
          source={{ uri: defaultStepImage }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />

        {/* Video Surface Player */}
        {videoUrl && !hasVideoError ? (
          <VideoView
            player={player}
            style={styles.video}
            contentFit="cover"
            nativeControls={false}
            surfaceType="textureView"
          />
        ) : null}

        {/* Top Header Overlay: Tag kỹ thuật Heron Style */}
        <View style={styles.topOverlay}>
          <View style={styles.stepTagBadge}>
            <View style={styles.liveIndicator} />
            <Text style={styles.stepTagText}>
              VIDEO THỰC HÀNH // BƯỚC {stepNumber < 10 ? `0${stepNumber}` : stepNumber}
            </Text>
          </View>

          {videoUrl && !hasVideoError ? (
            <Pressable onPress={toggleMute} style={styles.audioBtn}>
              <Text style={styles.audioIcon}>{isMuted ? '🔇' : '🔊'}</Text>
            </Pressable>
          ) : (
            <View style={[styles.stepTagBadge, { backgroundColor: 'rgba(250, 54, 0, 0.85)' }]}>
              <Text style={styles.stepTagText}>HD QUALITY</Text>
            </View>
          )}
        </View>

        {/* Center Play/Pause button */}
        {showControls ? (
          <View style={styles.centerOverlay}>
            <Pressable
              onPress={togglePlay}
              style={styles.playPauseBtn}
            >
              <Text style={styles.playPauseIcon}>{isPlaying ? '❚❚' : '▶'}</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Bottom Bar: Tiêu đề bước & nút thao tác nhanh */}
        <View style={styles.bottomBar}>
          <View style={styles.stepTitleWrap}>
            <Text style={styles.stepTitleLabel} numberOfLines={1}>
              {stepTitle}
            </Text>
          </View>

          {videoUrl && !hasVideoError ? (
            <Pressable onPress={handleReplay} style={styles.replayBtn}>
              <Text style={styles.replayText}>↺ PHÁT LẠI</Text>
            </Pressable>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 14,
  },
  viewport: {
    width: VIDEO_WIDTH,
    height: 210,
    backgroundColor: '#181918',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: HeronColors.border,
    ...HeronShadow.card,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  topOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 5,
  },
  stepTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(24, 25, 24, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: HeronColors.brand,
  },
  stepTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  audioBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(24, 25, 24, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  audioIcon: {
    fontSize: 14,
  },
  centerOverlay: {
    ...(StyleSheet.absoluteFill as any),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  playPauseBtn: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(250, 54, 0, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    ...HeronShadow.brandGlow,
  },
  playPauseIcon: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(24, 25, 24, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 5,
  },
  stepTitleWrap: {
    flex: 1,
    marginRight: 10,
  },
  stepTitleLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F6F6F4',
  },
  replayBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.xs,
  },
  replayText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
