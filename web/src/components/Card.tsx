import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  title?: string;
  onClick?: () => void;
}

export const Card = ({ children, title, onClick }: CardProps) => {
  return (
    <div
      onClick={onClick}
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {title && <h3 style={{ margin: '0 0 8px 0' }}>{title}</h3>}
      {children}
    </div>
  );
};

export default Card;
