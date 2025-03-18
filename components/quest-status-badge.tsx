'use client';

import { Badge } from './ui/badge';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  let variant: 
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'outline'
    | null
    | undefined = 'default';
    
  switch (status) {
    case 'draft':
      variant = 'secondary';
      break;
    case 'active':
      variant = 'default';
      break;
    case 'completed':
      variant = 'outline';
      break;
    case 'failed':
      variant = 'destructive';
      break;
  }
  
  return (
    <Badge variant={variant} className="capitalize">
      {status}
    </Badge>
  );
}