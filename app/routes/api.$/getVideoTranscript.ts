import path from 'node:path'
import speech from '@google-cloud/speech'
import { Storage } from '@google-cloud/storage'
import { os } from '@orpc/server'
import { execa } from 'execa'
import invariant from 'tiny-invariant'
import { EnvHttpProxyAgent, setGlobalDispatcher } from 'undici'
import { z } from 'zod/v4'

if (import.meta.env.DEV) {
	const envHttpProxyAgent = new EnvHttpProxyAgent()

	setGlobalDispatcher(envHttpProxyAgent)
}

const BUCKET_NAME = 'youtube2docs'

const speechClient = new speech.SpeechClient()

const storage = new Storage()

const AUDIO_FORMAT = 'mp3'

const AUDIO_CONTENT_TYPE = 'audio/mpeg'

const AUDIO_ENCODING = 'MP3'

const AUDIO_SAMPLE_RATE = 16000

const getVideoTranscript = os
	.input(z.object({ url: z.string() }))
	.handler(async ({ input }) => {
		const { url } = input

		const bucket = storage.bucket(BUCKET_NAME)

		const filenameProcess = await execa('yt-dlp', [
			'--restrict-filenames',
			'--print',
			'filename',
			url,
		])

		const originalFile = filenameProcess.stdout

		const filename =
			path.basename(originalFile, path.extname(originalFile)) +
			`.${AUDIO_FORMAT}`

		const file = bucket.file(filename)

		const writeStream = file.createWriteStream({
			resumable: false,
			contentType: AUDIO_CONTENT_TYPE,
		})

		const audioProcess = execa('yt-dlp', [
			'-x',
			'--audio-format',
			AUDIO_FORMAT,
			'--postprocessor-args',
			`ffmpeg: -ar ${AUDIO_SAMPLE_RATE}`,
			'-o',
			'-',
			url,
		])

		audioProcess.stdout.pipe(writeStream)

		await new Promise((resolve, reject) => {
			writeStream.on('finish', resolve)
			writeStream.on('error', reject)
		})

		await audioProcess

		const uri = `gs://${BUCKET_NAME}/${filename}`

		try {
			const start = Date.now()

			const [operation] = await speechClient.longRunningRecognize({
				audio: {
					uri,
				},
				config: {
					model: 'video',
					encoding: AUDIO_ENCODING,
					sampleRateHertz: AUDIO_SAMPLE_RATE,
					enableWordTimeOffsets: true,
					enableAutomaticPunctuation: true,
					languageCode: 'en-US',
				},
			})

			const [response] = await operation.promise()

			invariant(response.results, 'No transcription results found')

			const text = response.results
				.map((result) => {
					if (
						result.alternatives &&
						result.alternatives[0] &&
						result.alternatives[0].transcript
					) {
						return result.alternatives[0].transcript
					}

					return ''
				})
				.join('\n')

			return {
				text,
				end: Date.now() - start,
			}
		} finally {
			await file.delete()
		}
	})

export default getVideoTranscript
