import {createId} from './createId';
export function notify(message, type = 'success', title) {
  window.dispatchEvent(new CustomEvent('voxelvault:notification', { detail: { id: createId(), message, type, title } }));
}
