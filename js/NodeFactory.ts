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
    const controls = {
      rng: () => this.createRNGControls(header, model.params),
      spawn: () => this.createSpawnControls(header, model.params),
      creature: () => this.createCreatureControls(header, model.params),
      affliction: () => this.createAfflictionControls(header, model.params)
    };

    const fn = controls[model.type];
    if (fn) fn();
  }

  private createRNGControls(header: HTMLElement, params: NodeParams): void {
    this.createNumberInput(header, params, 'chance', 0, 1, 0.001, 0.5, 'chance');
  }

  private createSpawnControls(header: HTMLElement, params: NodeParams): void {
    this.createTextInput(header, params, 'item', 'revolver', 'item-field', 'itemPlaceholder');
  }

  private createCreatureControls(header: HTMLElement, params: NodeParams): void {
    this.createTextInput(header, params, 'creature', 'crawler', 'creature-field', 'creaturePlaceholder');
    this.createNumberInput(header, params, 'count', 1, null, 1, 1, 'count-field', '60px');
    this.createLabeledCheckbox(header, params, 'randomize', true, loc('randomizePosition'));
    this.createLocationSelect(header, params);
  }

  private createAfflictionControls(header: HTMLElement, params: NodeParams): void {
    this.createTextInput(header, params, 'affliction', 'bleeding', 'aff-field', 'afflictionPlaceholder');
    this.createNumberInput(header, params, 'strength', 0, null, 1, 15, 'strength-field', '60px');
    this.createTargetSelect(header, params);
  }

  // === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ КОНТРОЛОВ ===
  private createTextInput(header: HTMLElement, params: NodeParams, key: string, defaultValue: string, className: string, placeholderKey: string): void {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = className;
    input.list = 'item-datalist';
    input.value = params[key] as string || defaultValue;
    input.placeholder = loc(placeholderKey) || defaultValue;
    input.dataset.action = 'updateParam';
    input.dataset.key = key;
    input.dataset.id = params.id?.toString() || '';
    input.addEventListener('change', () => {
      params[key] = input.value.trim() || defaultValue;
      this.onParamChange();
    });
    header.appendChild(input);
  }

  private createNumberInput(header: HTMLElement, params: NodeParams, key: string, min: number, max: number | null, step: number, defaultValue: number, className: string, width: string | null = null): void {
    const input = document.createElement('input');
    input.type = 'number';
    input.min = min.toString();
    if (max !== null) input.max = max.toString();
    input.step = step.toString();
    input.value = (params[key] as number ?? defaultValue).toString();
    input.className = className;
    if (width) input.style.width = width;
    input.dataset.action = 'updateParam';
    input.dataset.key = key;
    input.dataset.id = params.id?.toString() || '';
    input.addEventListener('change', () => {
      params[key] = parseFloat(input.value) || defaultValue;
      this.onParamChange();
    });
    header.appendChild(input);
  }

  private createLabeledCheckbox(header: HTMLElement, params: NodeParams, key: string, defaultValue: boolean, labelText: string): void {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = params[key] as boolean ?? defaultValue;
    checkbox.dataset.action = 'updateParam';
    checkbox.dataset.key = key;
    checkbox.dataset.id = params.id?.toString() || '';
    checkbox.addEventListener('change', () => {
      params[key] = checkbox.checked;
      this.onParamChange();
    });
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(labelText));
    header.appendChild(label);
  }

  private createLocationSelect(header: HTMLElement, params: NodeParams): void {
    const select = document.createElement('select');
    select.className = 'location-field';

    const inside = document.createElement('option');
    inside.value = 'inside';
    inside.textContent = loc('insideSub');

    const outside = document.createElement('option');
    outside.value = 'outside';
    outside.textContent = loc('outsideSub');

    select.appendChild(inside);
    select.appendChild(outside);
    select.value = params.inside ?? true ? 'inside' : 'outside';
    select.dataset.action = 'updateParam';
    select.dataset.key = 'inside';
    select.dataset.id = params.id?.toString() || '';
    select.addEventListener('change', () => {
      params.inside = select.value === 'inside';
      this.onParamChange();
    });
    header.appendChild(select);
  }

  private createTargetSelect(header: HTMLElement, params: NodeParams): void {
    const select = document.createElement('select');
    select.className = 'target-field';

    const targets = [
      { value: 'character', key: 'targetCharacter' },
      { value: 'randomcrew', key: 'targetRandomCrew' },
      { value: 'allcrew', key: 'targetAllCrew' }
    ];

    targets.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.value;
      opt.textContent = loc(t.key);
      if (t.value === (params.target || 'character')) opt.selected = true;
      select.appendChild(opt);
    });

    select.dataset.action = '    'updateParam';
    select.dataset.key = 'target';
    select.dataset.id = params.id?.toString() || '';
    select.addEventListener('change', () => {
      params.target = select.value;
      this.onParamChange();
    });
    header.appendChild(select);
  }

  // === ВЕТКИ RNG ===
  private createBranch(id: number, suffix: string, labelClass: string, labelText: string): HTMLElement {
    const section = document.createElement('div');
    section.className = 'children';

    const label = document.createElement('div');
    label.className = labelClass;
    label.textContent = labelText;

    const buttons = document.createElement('div');
    buttons.style.cssText = 'margin:6px 0;display:flex;gap:6px;flex-wrap:wrap;';

    const actions = [
      { text: loc('addRNG'), type: 'rng' },
      { text: loc('addItem'), type: 'spawn' },
      { text: loc('addCreature'), type: 'creature' },
      { text: loc('addAffliction'), type: 'affliction' }
    ];

    actions.forEach(a => {
      const btn = document.createElement('button');
      btn.className = 'small';
      btn.textContent = a.text;
      btn.dataset.action = 'addNodeToBranch';
      btn.dataset.parentId = id.toString();
      btn.dataset.branch = suffix === '-s' ? 'success' : 'failure';
      btn.dataset.nodeType = a.type;
      buttons.appendChild(btn);
    });

    const container = document.createElement('div');
    container.id = `c-${id}${suffix}`;

    section.appendChild(label);
    section.appendChild(buttons);
    section.appendChild(container);

    return section;
  }

  // === ОБЩИЕ ПОВЕДЕНИЯ ===
  private attachCommonBehaviors(node: HTMLElement, model: NodeModel): void {
    const header = node.querySelector('.header-node') as HTMLElement;
    if (header) {
      header.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        node.classList.toggle('collapsed');
      });
      this.makeDraggable(node, header);
    }
  }

  private makeDraggable(node: HTMLElement, header: HTMLElement): void {
    let pos = { x: 0, y: 0 };

    const startDrag = (e: MouseEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).tagName === 'SELECT') return;
      e.preventDefault();

      pos.x = e.clientX - node.offsetLeft;
      pos.y = e.clientY - node.offsetTop;

      document.addEventListener('mousemove', drag);
      document.addEventListener('mouseup', stopDrag);
    };

    const drag = (e: MouseEvent) => {
      let newX = e.clientX - pos.x;
      let newY = e.clientY - pos.y;

      if (localStorage.getItem('snapToGrid') === 'true') {
        newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
        newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
      }

      node.style.position = 'absolute';
      node.style.left = newX + 'px';
      node.style.top = newY + 'px';
    };

    const stopDrag = () => {
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('mouseup', stopDrag);
      this.onParamChange();
    };

    header.addEventListener('mousedown', startDrag);
  }
}

// Глобальный экземпляр (временно, пока не перейдём на инъекцию)
const nodeFactory = new NodeFactory();

// Глобальные функции добавления в корень (временные)
(window as any).addRNG = () => {
  const newModel = nodeFactory.createModelRNG();
  (window as any).editorState.events[(window as any).editorState.currentEventIndex].model.push(newModel);
  (window as any).editorState.renderCurrentEvent();
};

(window as any).addSpawn = () => {
  const newModel = nodeFactory.createModelSpawn();
  (window as any).editorState.events[(window as any).editorState.currentEventIndex].model.push(newModel);
  (window as any).editorState.renderCurrentEvent();
};

(window as any).addCreature = () => {
  const newModel = nodeFactory.createModelCreature();
  (window as any).editorState.events[(window as any).editorState.currentEventIndex].model.push(newModel);
  (window as any).editorState.renderCurrentEvent();
};

(window as any).addAffliction = () => {
  const newModel = nodeFactory.createModelAffliction();
  (window as any).editorState.events[(window as any).editorState.currentEventIndex].model.push(newModel);
  (window as any).editorState.renderCurrentEvent();
};

export default nodeFactory;
