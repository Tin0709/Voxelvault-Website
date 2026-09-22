export function notify(message, type = 'success', title) {
  window.dispatchEvent(new CustomEvent('voxelvault:notification', { detail: { id: crypto.randomUUID(), message, type, title } }));
}
