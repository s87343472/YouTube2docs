import { EnvHttpProxyAgent, setGlobalDispatcher } from 'undici'
import getVideoInfo from './getVideoInfo'
import getVideoTranscript from './getVideoTranscript'
import getVideoTranscriptWithGemini from './getVideoTranscriptWithGemini'

if (import.meta.env.DEV) {
	const envHttpProxyAgent = new EnvHttpProxyAgent()

	setGlobalDispatcher(envHttpProxyAgent)
}

const router = {
	video: {
		info: getVideoInfo,
		transcript: getVideoTranscript,
		transcript_with_gemini: getVideoTranscriptWithGemini,
	},
}

export default router
