/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				rok: {
					bg: '#0f1117',
					surface: '#1a1d27',
					card: '#222639',
					border: '#2a2d3a',
					accent: '#f59e0b',
					red: '#ef4444',
					green: '#22c55e',
					blue: '#3b82f6',
					text: '#e2e8f0',
					muted: '#94a3b8',
					dim: '#64748b'
				}
			},
			fontFamily: {
				sans: ['Inter', 'system-ui', 'sans-serif']
			}
		}
	},
	plugins: []
};
