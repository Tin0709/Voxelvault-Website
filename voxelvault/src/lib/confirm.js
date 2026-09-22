export function confirmAction(message, title='Confirm removal') {
  return new Promise(resolve=>window.dispatchEvent(new CustomEvent('vault:confirm',{detail:{message,title,resolve}})));
}
