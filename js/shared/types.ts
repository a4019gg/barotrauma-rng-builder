// js/shared/types.ts — базовые типы для всего проекта

export interface NodeParams {
  chance?: number;
  item?: string;
  creature?: string;
  count?: number;
  randomize?: boolean;
  inside?: boolean;
  affliction?: string;
  strength?: number;
  target?: string;
  [key: string]: any; // для гибкости
}

export interface NodeModel {
  id: number;
  type: 'rng' | 'spawn' | 'creature' | 'affliction';
  params: NodeParams;
  children?: {
    success: NodeModel[];
    failure: NodeModel[];
  };
  calculated?: {
    global?: number;
    local?: number;
    final?: number;
  };
}

export interface EventModel {
  model: NodeModel[];
}

export type Branch = 'success' | 'failure';

export type NodeType = 'rng' | 'spawn' | 'creature' | 'affliction';
