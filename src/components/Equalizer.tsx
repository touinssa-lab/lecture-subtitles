import React from 'react';

interface EqualizerProps {
  active?: boolean;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Equalizer: React.FC<EqualizerProps> = ({
  active = true,
  color = '#ffffff',
  size = 'md',
}) => {
  const height = size === 'sm' ? '12px' : size === 'lg' ? '18px' : '14px';
  const barWidth = size === 'sm' ? '2px' : size === 'lg' ? '3px' : '3px';
  const gap = size === 'sm' ? '2px' : '3px';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: gap,
        height: height,
        color: color,
      }}
    >
      <span
        className={active ? 'eq-bar eq-bar-1' : 'eq-bar'}
        style={{ width: barWidth, height: active ? undefined : '3px' }}
      />
      <span
        className={active ? 'eq-bar eq-bar-2' : 'eq-bar'}
        style={{ width: barWidth, height: active ? undefined : '7px' }}
      />
      <span
        className={active ? 'eq-bar eq-bar-3' : 'eq-bar'}
        style={{ width: barWidth, height: active ? undefined : '11px' }}
      />
      <span
        className={active ? 'eq-bar eq-bar-4' : 'eq-bar'}
        style={{ width: barWidth, height: active ? undefined : '5px' }}
      />
    </div>
  );
};
