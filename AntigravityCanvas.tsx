@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-serif: "Playfair Display", ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
}

body {
  font-family: var(--font-sans);
  background-color: #FAFAFA;
  color: #141414;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-sans);
}
