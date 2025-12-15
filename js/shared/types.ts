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
  [key: string]: any;
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
