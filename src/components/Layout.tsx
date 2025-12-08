import React from 'react';
import { theme } from '../theme';

export const Layout: React.FC<{
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, right, children }) => {
  const HEADER_H = 56;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: `${HEADER_H}px`, padding: `0 ${theme.space(2)}`, borderBottom: `1px solid ${theme.color.border}` }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>{title}</div>
        <div style={{ display: 'flex', gap: theme.space(1) }}>{right}</div>
      </div>
      <div style={{ height: `calc(100vh - ${HEADER_H}px)`, overflow: 'hidden' }}>{children}</div>
    </div>
  );
};

export default Layout;
