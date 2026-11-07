(() => {
  const calculator = document.querySelector("[data-photo-session-calculator]");
  if (!calculator) {
    return;
  }

  const options = [...calculator.querySelectorAll('input[name="photo-sessions"]')];
  const unitPrice = calculator.querySelector("[data-photo-session-unit]");
  const basePriceCents = Number(calculator.dataset.basePriceCents);
  if (!Number.isSafeInteger(basePriceCents) || basePriceCents <= 0) {
    return;
  }
  const currency = new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const update = () => {
    const selected = options.find((option) => option.checked);
    const count = Number(selected.value);
    const discount = count >= 4 ? 15 : (count - 1) * 5;
    const unitCents = basePriceCents * (100 - discount) / 100;
    unitPrice.textContent = currency.format(unitCents / 100);
  };

  options.forEach((option) => option.addEventListener("change", update));
  window.addEventListener("pageshow", update);
  update();
  calculator.hidden = false;
})();
