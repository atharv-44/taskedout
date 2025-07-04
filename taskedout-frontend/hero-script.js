document.addEventListener("DOMContentLoaded", () => {
  const links = document.querySelectorAll(".transition-link");

  for (let link of links) {
    link.addEventListener("click", function (e) {
      e.preventDefault(); // prevent instant navigation
      document.body.classList.add("fade-out");

      setTimeout(() => {
        window.location.href = this.href;
      }, 500); // match transition time
    });
  }
});
window.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("loaded");
});
