import { mantineHtmlProps, ColorSchemeScript } from '@mantine/core'
import { type PropsWithChildren } from 'react'
import { Links, Meta, Scripts, ScrollRestoration } from 'react-router'
import MainLayout from './components/layout/MainLayout'
import Providers from './Providers'

import './app.css'

export const Layout = ({ children }: PropsWithChildren) => {
	return (
		<html lang="en" {...mantineHtmlProps}>
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>React Router Starter</title>
				<link rel="icon" type="image/svg+xml" href="/vite.svg" />
				<Meta />
				<Links />
				<ColorSchemeScript />
			</head>
			<body>
				<Providers>{children}</Providers>
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	)
}

const App = () => {
	return <MainLayout />
}

export default App
