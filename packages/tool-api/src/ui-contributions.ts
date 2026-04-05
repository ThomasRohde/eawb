export interface UIContribution {
  type: 'panel' | 'sidebar-section' | 'inspector-tab' | 'status-bar-item';
  id: string;
  component: string;
  title: string;
  defaultPosition?: 'left' | 'right' | 'bottom' | 'center';
}
