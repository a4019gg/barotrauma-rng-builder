export class TreeService {
  constructor(containerSelector = '#tree-svg') {
    this.containerSelector = containerSelector;
    this.svg = null;
    this.g = null;
    this.width = 1200;
    this.height = 720;
  }

  init() {
    if (!window.d3) {
      throw new Error('D3 is not loaded');
    }

    this.svg = window.d3.select(this.containerSelector);
    this.svg.attr('viewBox', `0 0 ${this.width} ${this.height}`);
    this.svg.selectAll('*').remove();
    this.g = this.svg.append('g').attr('transform', 'translate(40,20)');
  }

  toHierarchy(model) {
    return {
      name: 'Root Event',
      children: model.map(node => this.toTreeNode(node))
    };
  }

  toTreeNode(node) {
    if (node.type === 'rng') {
      return {
        name: `RNG (${Math.round((node.params.chance ?? 0.5) * 100)}%)`,
        children: [
          { name: 'Success', children: node.children.success.map(child => this.toTreeNode(child)) },
          { name: 'Failure', children: node.children.failure.map(child => this.toTreeNode(child)) }
        ].filter(branch => branch.children.length)
      };
    }

    if (node.type === 'spawn') {
      return { name: `Item: ${node.params.item || 'unset'}` };
    }

    if (node.type === 'creature') {
      return { name: `Creature: ${node.params.creature || 'unset'}` };
    }

    if (node.type === 'affliction') {
      return { name: `Affliction: ${node.params.affliction || 'unset'}` };
    }

    return { name: node.type };
  }

  render(model) {
    if (!this.svg) this.init();

    this.g.selectAll('*').remove();
    if (!model.length) return;

    const root = window.d3.hierarchy(this.toHierarchy(model));
    const treeLayout = window.d3.tree().size([this.height - 60, this.width - 220]);
    treeLayout(root);

    this.g
      .selectAll('.tree-link')
      .data(root.links())
      .join('path')
      .attr('class', 'tree-link')
      .attr('d', window.d3.linkHorizontal().x(d => d.y).y(d => d.x));

    const nodes = this.g
      .selectAll('.tree-node')
      .data(root.descendants())
      .join('g')
      .attr('class', 'tree-node')
      .attr('transform', d => `translate(${d.y},${d.x})`);

    nodes.append('circle').attr('r', 8);
    nodes
      .append('text')
      .attr('x', d => (d.children ? -12 : 12))
      .attr('text-anchor', d => (d.children ? 'end' : 'start'))
      .attr('dy', '0.32em')
      .text(d => d.data.name);
  }
}
