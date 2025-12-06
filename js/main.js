// js/main.js

let currentEvent = 0;
const events = [{ html: '', eventId: 'lucky_box_event' }];

function switchEvent(index) {
  events[currentEvent] = {
    html: document.getElementById('root-children').innerHTML,
    eventId: document.getElementById('event-id').value
  };
  currentEvent = index;
  document.getElementById('root-children').innerHTML = events[index].html || '';
  document.getElementById('event-id').value = events[index].eventId || `event_${index + 1}`;
  document.querySelectorAll('#events-tabs .tab').forEach((t, i) => t.classList.toggle('active', i === index));
  updateAll();
}

function deleteEvent(index) {
  if (events.length <= 1) return alert('Cannot delete the last event!');
  if (confirm('Delete event?')) {
    events.splice(index, 1);
    document.querySelectorAll('#events-tabs .tab')[index].remove();
    if (currentEvent >= events.length) currentEvent = events.length - 1;
    switchEvent(currentEvent);
  }
}

function addEvent() {
  const index = events.length;
  events.push({ html: '', eventId: `event_${index + 1}` });
  const tab = document.createElement('button');
  tab.className = 'tab';
  tab.innerHTML = `Event ${index + 1} <span class="delete-tab" onclick="deleteEvent(${index})">×</span>`;
  tab.onclick = (e) => {
    if (!e.target.classList.contains('delete-tab')) switchEvent(index);
  };
  document.querySelector('#events-tabs .add').before(tab);
  switchEvent(index);
}

function toggleView() {
  const classic = document.getElementById('classic-view');
  const isFullscreen = classic.classList.toggle('fullscreen');
  document.getElementById('tree-container').classList.toggle('hidden', isFullscreen);
  document.getElementById('view-btn').textContent = isFullscreen ? 'Tree View' : 'Classic View';
  if (!isFullscreen) renderTree();
}

document.addEventListener('DOMContentLoaded', () => {
  populateDatalist();
  setTheme(localStorage.getItem('theme') || 'dark');
  setLang(localStorage.getItem('lang') || 'en');
  loadExample();

  document.addEventListener('mouseover', e => {
    if (e.target.classList.contains('prob') && e.target.dataset.tip) {
      let tooltip = document.getElementById('prob-tooltip');
      if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'prob-tooltip';
        tooltip.style.cssText = 'position:absolute;background:#333;color:#fff;padding:4px 8px;border-radius:4px;font-size:11px;z-index:1000;pointer-events:none;';
        document.body.appendChild(tooltip);
      }
      tooltip.textContent = e.target.dataset.tip;
      tooltip.style.left = (e.pageX + 10) + 'px';
      tooltip.style.top = (e.pageY + 10) + 'px';
    }
  });

  document.addEventListener('mouseout', e => {
    if (e.target.classList.contains('prob')) {
      const tooltip = document.getElementById('prob-tooltip');
      if (tooltip) tooltip.remove();
    }
  });
});

window.switchEvent = switchEvent;
window.deleteEvent = deleteEvent;
window.addEvent = addEvent;
window.toggleView = toggleView;
