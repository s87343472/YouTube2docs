import { href, Navigate } from 'react-router'

const HomePage = () => {
	return (
		<Navigate
			to={href('/projects/:url', {
				url: encodeURIComponent('https://www.youtube.com/watch?v=Bry8a_7b9aM'),
			})}
		/>
	)
}

export default HomePage
