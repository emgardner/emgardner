/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin')
module.exports = {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {},
	},
	plugins: [
    plugin(function({ addBase, theme }) {
      addBase({
        'h1': { fontSize: theme('fontSize.4xl') },
        'h2': { fontSize: theme('fontSize.3xl') },
        'h3': { fontSize: theme('fontSize.2xl') },
        'h4': { fontSize: theme('fontSize.1xl') },
        'h5': { fontSize: theme('fontSize.lg') }
      })
    }),
		require('@tailwindcss/typography'),
	],
}