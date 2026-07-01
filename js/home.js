document.addEventListener('DOMContentLoaded', () => {
  initLayout('home');

  const heroStats = document.getElementById('hero-stats');
  if (heroStats) {
    heroStats.innerHTML = getStatsBar(true);
    initStatsCounters(heroStats);
    initScrollReveal(heroStats);
  }

  const processEl = document.getElementById('process-steps');
  if (processEl) {
    processEl.innerHTML = getProcessSteps();
    initScrollReveal(processEl);
  }

  const trustEl = document.getElementById('trust-signals');
  if (trustEl) {
    trustEl.innerHTML = getTrustSignals();
    initScrollReveal(trustEl);
  }

  const productsSection = document.getElementById('home-products');
  if (productsSection) {
    productsSection.innerHTML = getProductsGridHtml();
    initProductBuyButtons(productsSection);
    initScrollReveal(productsSection);
  }

  const reviewsEl = document.getElementById('home-reviews');
  if (reviewsEl) {
    reviewsEl.innerHTML = getFeedbackPreview(6, {
      title: 'Here are some reviews from our customers',
      subtitle: 'Real feedback from buyers on Valorant Points, accounts, and delivery.',
    });
    initScrollReveal(reviewsEl);
  }

  initScrollReveal(document.querySelector('main'));
});