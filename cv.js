document.addEventListener('DOMContentLoaded', () => {
  const printButtons = document.querySelectorAll('.js-print-button');

  for (const button of printButtons) {
    button.addEventListener('click', () => {
      window.print();
    });
  }
});