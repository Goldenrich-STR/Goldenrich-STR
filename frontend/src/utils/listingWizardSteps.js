// Keep persisted indexes tied to the original steps, even when one is hidden.
export const listingWizardNavigation = (steps, savedIndex, subscriptionEnabled) => {
  const visibleSteps = steps.map((item, index) => ({ ...item, index }))
    .filter((item) => subscriptionEnabled || item.key !== 'subscription');
  const requested = Number.isFinite(savedIndex) ? Math.max(0, Math.min(savedIndex, steps.length - 1)) : 0;
  const current = visibleSteps.find((item) => item.index >= requested) || visibleSteps[visibleSteps.length - 1];
  const position = visibleSteps.findIndex((item) => item.index === current.index);
  return {
    visibleSteps, currentIndex: current.index, position,
    previousIndex: visibleSteps[Math.max(0, position - 1)].index,
    nextIndex: visibleSteps[Math.min(visibleSteps.length - 1, position + 1)].index,
  };
};
