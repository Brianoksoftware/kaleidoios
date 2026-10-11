import Svg, { Circle, Path, Polygon, Rect } from 'react-native-svg';

type IconProps = { size?: number; color?: string; stroke?: number };

export function RotateIcon({ dir, size = 34, color = '#140824', stroke = 2.8 }: IconProps & { dir: -1 | 1 }) {
  const arc = dir < 0 ? 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' : 'M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8';
  const head = dir < 0 ? 'M3 3v5h5' : 'M21 3v5h-5';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={arc} stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={head} stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function PauseIcon({ size = 22, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={5.5} y={4} width={4.5} height={16} rx={1.6} fill={color} />
      <Rect x={14} y={4} width={4.5} height={16} rx={1.6} fill={color} />
    </Svg>
  );
}

export function PlayIcon({ size = 22, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7 4.8v14.4c0 .8.9 1.3 1.6.9l11.3-7.2c.6-.4.6-1.4 0-1.8L8.6 3.9C7.9 3.5 7 4 7 4.8z" fill={color} />
    </Svg>
  );
}

export function ReplayIcon({ size = 22, color = '#FFFFFF', stroke = 2.6 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 12a9 9 0 1 0 2.64-6.36L3 8" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3 3v5h5" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function SparkleIcon({ size = 20, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2l2.4 6.8L21 12l-6.6 3.2L12 22l-2.4-6.8L3 12l6.6-3.2z"
        fill={color}
      />
    </Svg>
  );
}

export function HomeIcon({ size = 20, color = '#FFFFFF', stroke = 2.2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"
        stroke={color}
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SoundIcon({ on, size = 20, color = '#FFFFFF', stroke = 2 }: IconProps & { on: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3.5 9.2h3.8L12 5v14l-4.7-4.2H3.5z" fill={color} stroke={color} strokeWidth={1.2} strokeLinejoin="round" />
      {on ? (
        <>
          <Path d="M15.5 9a4.2 4.2 0 0 1 0 6" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
          <Path d="M18.4 6.2a8.2 8.2 0 0 1 0 11.6" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
        </>
      ) : (
        <>
          <Path d="M16 9.5l5 5" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
          <Path d="M21 9.5l-5 5" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}

export function HapticsIcon({ on, size = 20, color = '#FFFFFF', stroke = 2 }: IconProps & { on: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={7.5} y={3.5} width={9} height={17} rx={2.2} stroke={color} strokeWidth={stroke} />
      <Path d="M3.5 8.5v7M20.5 8.5v7" stroke={color} strokeWidth={stroke} strokeLinecap="round" opacity={on ? 1 : 0.35} />
      {!on && <Path d="M3 3l18 18" stroke={color} strokeWidth={stroke} strokeLinecap="round" />}
    </Svg>
  );
}

export function CrownIcon({ size = 16, color = '#FFBE0B' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 7.5l4.8 4.2L12 4.5l4.2 7.2L21 7.5l-1.9 11H4.9z" fill={color} />
      <Rect x={5} y={19.6} width={14} height={2} rx={1} fill={color} />
    </Svg>
  );
}

/* --- How-to-play glyphs --- */

export function SparkGlyph({ size = 26, color = '#FF4D6D' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26">
      <Circle cx={13} cy={13} r={11} fill={color} opacity={0.18} />
      <Circle cx={13} cy={13} r={6.5} fill={color} />
      <Circle cx={11} cy={11} r={2} fill="#FFFFFF" opacity={0.75} />
    </Svg>
  );
}

export function ChainGlyph({ size = 26, color = '#00F5D4' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26">
      <Circle cx={5} cy={13} r={3.6} fill={color} />
      <Circle cx={13} cy={13} r={3.6} fill={color} />
      <Circle cx={21} cy={13} r={3.6} fill={color} />
      <Path d="M8.6 13h0.8M16.6 13h0.8" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function StarGlyph({ size = 26, color = '#FFBE0B' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26">
      <Path d="M13 2l2.6 8.4L24 13l-8.4 2.6L13 24l-2.6-8.4L2 13l8.4-2.6z" fill={color} />
      <Polygon points="21,3 22,5.5 24.5,6.5 22,7.5 21,10 20,7.5 17.5,6.5 20,5.5" fill="#FFFFFF" opacity={0.85} />
    </Svg>
  );
}

export function CrackGlyph({ size = 26, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26" fill="none">
      <Path d="M13 2.5 22 7.75v10.5L13 23.5 4 18.25V7.75z" stroke={color} strokeWidth={1.6} opacity={0.5} strokeLinejoin="round" />
      <Path d="M14 3l-3 7 4.5 3.5L11 23" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M15.5 13.5l4.5 1.5M11 10l-4-1" stroke={color} strokeWidth={1.3} strokeLinecap="round" opacity={0.7} />
    </Svg>
  );
}

/** Faceted glass gem used for the life pips. */
export function GemPip({ cracked, color = '#00F5D4', size = 22 }: { cracked: boolean; color?: string; size?: number }) {
  const body = cracked ? '#3A0F22' : color;
  const edge = cracked ? '#FF4D6D' : 'rgba(255,255,255,0.75)';
  return (
    <Svg width={size} height={size * 1.1} viewBox="0 0 20 22">
      <Polygon points="10,1 19,6 19,16 10,21 1,16 1,6" fill={body} stroke={edge} strokeWidth={1.2} strokeLinejoin="round" />
      {!cracked ? (
        <>
          <Polygon points="10,1 19,6 10,10.5 1,6" fill="#FFFFFF" opacity={0.45} />
          <Polygon points="10,10.5 19,6 19,16 10,21" fill="#000000" opacity={0.16} />
        </>
      ) : (
        <>
          <Path d="M11 2 8.5 8.5 12.5 12 9 20.5" stroke="#FF9FB2" strokeWidth={1.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M12.5 12 17 13.5M8.5 8.5 4 8" stroke="#FF9FB2" strokeWidth={1} fill="none" strokeLinecap="round" opacity={0.8} />
        </>
      )}
    </Svg>
  );
}
