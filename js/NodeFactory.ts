// js/NodeFactory.ts — v0.9.401 — NODE FACTORY НА TYPESCRIPT

import { NodeModel, NodeParams, Branch } from './shared/types';
import { loc } from './utils';

const NODES_VERSION = "v0.9.401";
(window as any).NODES_VERSION = NODES_VERSION;

const GRID_SIZE = 30;

interface NodeFactoryDependencies {
  removeNode?: (id: number) => void;
  onParamChange?: () => void;
  render?: () => void;
}

class NodeFactory {
  private idCounter: number = 0;
  private removeNode: (id: number) => void;
  private onParamChange: () => void;
  private render: () => void;

  constructor(dependencies: NodeFactoryDependencies = {}) {
    this.removeNode = dependencies.removeNode || ((id) => console.warn('removeNode not provided', id));
    this.onParamChange = dependencies.onParamChange || (() => console.warn('onParamChange not provided'));
    this.render = dependencies.render || (() => console.warn('render not provided'));
  }

  private generateId(): number {
    return this.idCounter++;
  }

  // === СОЗДАНИЕ МОДЕЛИ УЗЛА ===
  createModel(type: 'rng' | 'spawn' | 'creature' | 'affliction', params: NodeParams = {}): NodeModel {
    const id = this.generateId();
    const base: NodeModel = { id, type, params };

    if (type === 'rng') {
      return {
        ...base,
        children: { success: [], failure: [] }
      };
    }

    return base;
  }

  createModelRNG(chance = 0.5): NodeModel {
    return this.createModel('rng', { chance });
  }

  createModelSpawn(item = 'revolver'): NodeModel {
    return this.createModel('spawn', { item });
  }

  createModelCreature(creature = 'crawler', count = 1, randomize = true, inside = true): NodeModel {
    return this.createModel('creature', { creature, count, randomize, inside });
  }

  createModelAffliction(affliction = 'bleeding', strength = 15, target = 'character'): NodeModel {
    return this.createModel('affliction', { affliction, strength, target });
  }

  // === СОЗДАНИЕ DOM ИЗ МОДЕЛИ ===
  createFromModel(model: NodeModel): HTMLElement {
    if (!model || !model.type) {
      console.warn('Invalid model', model);
      return document.createElement('div');
    }

    const node = document.createElement('div');
    node.className = `node ${model.type} draggable`;
    node.dataset.id = model.id.toString();
    node.dataset.type = model.type;

    const header = this.createHeader(model);
    node.appendChild(header);

    if (model.type === 'rng' && model.children) {
      const successSection = this.createBranch(model.id, '-s', 'success-label', loc('successLabel'));
      const failureSection = this.createBranch(model.id, '-f', 'failure-label', loc('failureLabel'));

      const successContainer = successSection.querySelector(`#c-${model.id}-s`) as HTMLElement;
      const failureContainer = failureSection.querySelector(`#c-${model.id}-f`) as HTMLElement;

      (model.children.success || []).forEach(child => {
        if (child) successContainer.appendChild(this.createFromModel(child));
      });

      (model.children.failure || []).forEach(child => {
        if (child) failureContainer.appendChild(this.createFromModel(child));
      });

      node.appendChild(successSection);
      node.appendChild(failureSection);
    }

    this.attachCommonBehaviors(node, model);
    return node;
  }

  private createHeader(model: NodeModel): HTMLElement {
    const header = document.createElement('div');
    header.className = 'header-node';

    const title = document.createElement('span');
    title.textContent = this.getTitle(model);
    header.appendChild(title);

    this.appendTypeSpecificControls(header, model);

    // Кнопка удаления
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'danger small';
    deleteBtn.textContent = '×';
    deleteBtn.dataset.action = 'removeNode';
    deleteBtn.dataset.id = model.id.toString();
    header.appendChild(deleteBtn);

    // Вероятности (заглушка)
    const prob = document.createElement('span');
    prob.className = 'prob';
    prob.innerHTML = '<span class="global">0.000%</span><br><small class="local">100.0%</small>';
    header.appendChild(prob);

    const finalChance = document.createElement('span');
    finalChance.className = 'final-chance';
    finalChance.style.marginLeft = '10px';
    finalChance.style.color = '#888';
    header.appendChild(finalChance);

    return header;
  }

  private getTitle(model: NodeModel): string {
    const titles: Record<string, string> = {
      rng: loc('rngAction'),
      spawn: loc('spawnItem'),
      creature: loc('spawnCreature'),
      affliction: loc('applyAffliction')
    };
    return titles[model.type] || loc('unknownNode');
  }

  private appendTypeSpecificControls(header: HTMLElement, model: NodeModel): void {
    const controls =
