import React from 'react';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

/**
 * CookFlow AI Sous-Chef mark: a speech bubble (chat) wearing a chef hat, with an AI sparkle.
 * variant "solid" = flame bubble + white hat (buttons, headers); "soft" = light bubble for avatars.
 */
export const AiChefLogo = ({ size = 40, variant = 'solid' }) => {
  const soft = variant === 'soft';
  const id = `aiChefGrad_${variant}`;
  return <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityRole="image" accessibilityLabel="Logo trợ lý AI CookFlow">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={soft ? '#FFF4EF' : '#FF7A3D'} />
          <Stop offset="1" stopColor={soft ? '#FFE1D6' : '#FA3600'} />
        </LinearGradient>
      </Defs>
      {/* Chat bubble with a tail at the bottom-left */}
      <Path d="M20 4 H44 A16 16 0 0 1 60 20 V34 A16 16 0 0 1 44 50 H27 L13 60 L16 49 A16 16 0 0 1 4 34 V20 A16 16 0 0 1 20 4 Z" fill={`url(#${id})`} />
      {/* Chef hat: three puffs + band */}
      <Circle cx="23.5" cy="22" r="7" fill={soft ? '#FA3600' : '#FFFFFF'} />
      <Circle cx="32" cy="18" r="8.5" fill={soft ? '#FA3600' : '#FFFFFF'} />
      <Circle cx="40.5" cy="22" r="7" fill={soft ? '#FA3600' : '#FFFFFF'} />
      <Rect x="23" y="22" width="18" height="17" rx="3" fill={soft ? '#FA3600' : '#FFFFFF'} />
      <Rect x="23" y="33" width="18" height="2.4" fill={soft ? '#FFE1D6' : '#FFC9B3'} />
      {/* Friendly bot eyes on the hat */}
      <Circle cx="28.5" cy="27.5" r="1.9" fill={soft ? '#FFFFFF' : '#FA3600'} />
      <Circle cx="35.5" cy="27.5" r="1.9" fill={soft ? '#FFFFFF' : '#FA3600'} />
      {/* AI sparkle */}
      <Path d="M50 7 L51.6 11.4 L56 13 L51.6 14.6 L50 19 L48.4 14.6 L44 13 L48.4 11.4 Z" fill={soft ? '#FA3600' : '#FFE08A'} />
    </Svg>;
};
