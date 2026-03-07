export function applyTreeLayout(root, nodeSize = [190, 430]) {
  window.d3.tree().nodeSize(nodeSize)(root);
  return root;
}
