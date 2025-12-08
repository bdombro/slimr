// import react from '@vitejs/plugin-react-swc'
import { resolve } from "node:path"
import preact from "@preact/preset-vite"
import { defineConfig, type UserConfigExport } from "vite"

// const invokation = process.argv[1].split('/').at(-1) // i.e. vite, vitest or storybook

const prodConfig: UserConfigExport = {
	plugins: [preact()],
	resolve: {
		alias: {
			react: "preact/compat",
			"react-dom": "preact/compat",
			"~": resolve(__dirname, "src"),
		},
	},
	build: {
		cssCodeSplit: false,
		modulePreload: {
			// Disable module preload bc it disrupts lazy loading
			resolveDependencies: () => [],
		},
		rollupOptions: {
			input: {
				main: resolve(__dirname, "index.html"),
			},
			output: {
				// Comment out manualChunks for default code-splitting
				/**
				 * Manual chunks is a key/val or function that returns an answer
				 * of which bundle a module should be placed in for splitting.
				 * Returning undefined will use the default strategy.
				 *
				 * @param {string} id - The module id aka the path to the module
				 *
				 * @returns {string | undefined} - The name of the chunk to place the module in or undefined to use default
				 */
				// manualChunks: id => {
				//   const fileNameNoExt = id.split('/').at(-1).split('.').slice(0, -1).join('.')
				//   if (id.includes('@slimr/mdi-paths') && !id.includes('component')) {
				//     return 'icons/' + fileNameNoExt
				//   }
				//   if (id.includes('highlight.js') && !id.includes('lazy')) {
				//     return 'highlightjs'
				//   }
				//   if (id.includes('swapi')) {
				//     return 'util/' + fileNameNoExt
				//   }
				//   if (id.includes('pages') && !id.includes('pages/index')) {
				//     return 'pages/' + fileNameNoExt
				//   }
				//   return 'main'
				// },
			},
		},
	},
}

// https://vitejs.dev/config/
export default defineConfig(prodConfig)
